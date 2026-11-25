import { type ButtonComponent, Menu, Modal, Notice, Setting } from 'obsidian'
import type { Canvas, CanvasNode } from 'src/@types/Canvas'
import { t } from 'src/i18n'
import type CanvasEnhancePlugin from 'src/main'
import CanvasExtension from './canvas-extension'
import CanvasHelper from 'src/utils/canvas-helper'
import { CARD_SECTION_FONT_CONTROLS, getCardAppearance } from 'src/settings/card-appearance'

const SECTIONS = ['header', 'footer'] as const
type Section = typeof SECTIONS[number]

export default class CardContentExtension extends CanvasExtension {
  private modal?: Modal

  isEnabled() { return true }

  init() {
    const render = (_canvas: Canvas, node: CanvasNode) => this.render(node)
    for (const event of ['canvas-enhance:node-rendered', 'canvas-enhance:node-changed', 'canvas-enhance:node-editing-state-changed'] as const)
      this.plugin.registerEvent(this.plugin.app.workspace.on(event, render))
    this.plugin.registerEvent(this.plugin.app.workspace.on('canvas-enhance:data-loaded:after', canvas => {
      for (const node of canvas.nodes.values()) this.render(node)
    }))
    this.plugin.registerEvent(this.plugin.app.workspace.on('canvas:node-menu', (menu: Menu, node: CanvasNode) => {
      if (node.canvas.readonly || node.getData().type !== 'text') return
      for (const section of SECTIONS)
        menu.addItem(item => item.setTitle(this.label(node, section)).setIcon(`panel-${section === 'header' ? 'top' : 'bottom'}`)
          .onClick(() => this.open(node, section)))
    }))
    this.plugin.registerEvent(this.plugin.app.workspace.on('canvas-enhance:popup-menu-created', canvas => this.updateMenu(canvas)))
    for (const canvas of this.plugin.getCanvases())
      for (const node of canvas.nodes.values()) this.render(node)
    this.plugin.register(() => {
      this.modal?.close()
      for (const canvas of this.plugin.getCanvases()) {
        this.clearMenu(canvas)
        for (const node of canvas.nodes.values()) this.clear(node)
      }
    })
  }

  private clear(node: CanvasNode) {
    if (!node.contentEl) return
    node.contentEl.querySelectorAll(':scope > .ce-card-section').forEach(el => el.remove())
    node.contentEl.classList.remove('ce-card-content')
  }

  private render(node: CanvasNode) {
    if (!node.contentEl) return
    const data = node.getData()
    if (data.type !== 'text' || !data.cardContent) {
      this.clear(node)
      return
    }
    for (const section of SECTIONS) {
      const value = data.cardContent[section]
      let el = node.contentEl.querySelector<HTMLElement>(`:scope > .ce-card-${section}`)
      if (typeof value !== 'string' || !value.trim()) {
        el?.remove()
        continue
      }
      if (!el) {
        el = node.contentEl.ownerDocument.createElement('div')
        el.className = `ce-card-section ce-card-${section}`
        el.dir = 'auto'
        if (section === 'header') node.contentEl.prepend(el)
        else node.contentEl.append(el)
      }
      if (el.textContent !== value) el.textContent = value
    }
    node.contentEl.classList.toggle('ce-card-content', !!node.contentEl.querySelector(':scope > .ce-card-section'))
  }

  private label(node: CanvasNode, section: Section) {
    return t(`card.${section}.${node.getData().cardContent?.[section] ? 'edit' : 'add'}`)
  }

  private clearMenu(canvas: Canvas) {
    for (const section of SECTIONS) canvas.menu?.menuEl.querySelector(`#ce-card-${section}`)?.remove()
  }

  private updateMenu(canvas: Canvas) {
    const node = CanvasHelper.getSelectedNode(canvas)
    if (canvas.readonly || canvas.selection.size !== 1 || node?.getData().type !== 'text') {
      this.clearMenu(canvas)
      return
    }
    for (const section of SECTIONS) {
      const button = CanvasHelper.createPopupMenuOption({
        id: `ce-card-${section}`,
        label: this.label(node, section),
        icon: `panel-${section === 'header' ? 'top' : 'bottom'}`,
        callback: () => {
          const selected = CanvasHelper.getSelectedNode(canvas)
          if (selected && canvas.selection.size === 1) this.open(selected, section)
        }
      })
      CanvasHelper.addPopupMenuOption(canvas, button)
    }
  }

  private open(node: CanvasNode, section: Section) {
    if (node.canvas.readonly || node.getData().type !== 'text') return
    this.modal?.close()
    const modal = new CardContentModal(this.plugin, node, section, this.label(node, section),
      value => this.save(node, section, value), () => { if (this.modal === modal) this.modal = undefined })
    this.modal = modal
    modal.open()
  }

  private save(node: CanvasNode, section: Section, value: string) {
    const canvas = node.canvas
    if (canvas.readonly || canvas.nodes.get(node.id) !== node || node.getData().type !== 'text') return
    const data = { ...node.getData() }
    const cardContent = { ...data.cardContent }
    if (value.trim()) cardContent[section] = value
    else delete cardContent[section]
    if (Object.keys(cardContent).length) data.cardContent = cardContent
    else delete data.cardContent
    if (JSON.stringify(data.cardContent) === JSON.stringify(node.getData().cardContent)) return
    node.setData(data)
    // Resize synchronously so content and height are captured in the same undo step.
    this.plugin.app.workspace.trigger('canvas-enhance:card-content-changed', canvas, node)
    canvas.pushHistory(canvas.getData())
    this.updateMenu(canvas)
  }
}

class CardContentModal extends Modal {
  private dismissed = false

  constructor(private plugin: CanvasEnhancePlugin, private node: CanvasNode, private section: Section, private title: string, private save: (value: string) => void, private onClosed: () => void) {
    super(plugin.app)
  }

  onOpen() {
    this.setTitle(this.title)
    this.contentEl.createEl('p', { text: t('card.description') })
    const saved = this.node.getData().cardContent?.[this.section]
    let value = typeof saved === 'string' ? saved : ''
    new Setting(this.contentEl).setName(t(`card.${this.section}`)).addTextArea(input => {
      input.setValue(value).onChange(text => { value = text })
      input.inputEl.rows = 3
      input.inputEl.setAttribute('aria-label', t(`card.${this.section}`))
    })
    const control = CARD_SECTION_FONT_CONTROLS[this.section]
    const initialSize = Number(getCardAppearance(this.plugin.settings.getSetting('cardAppearance'))[control.key])
    let fontSizeInput: HTMLInputElement
    new Setting(this.contentEl).setName(t(control.label)).setDesc(t(`card.${this.section}.fontScope`))
      .addText(input => {
        fontSizeInput = input.inputEl
        fontSizeInput.type = 'number'
        fontSizeInput.min = String(control.min)
        fontSizeInput.max = String(control.max)
        input.setPlaceholder(t('card.fontDefault')).setValue(String(initialSize))
      })
    let saving = false
    const actions: ButtonComponent[] = []
    new Setting(this.contentEl)
      .addButton(button => {
        actions.push(button)
        button.setButtonText(t(`card.${this.section}.remove`)).onClick(() => { this.save(''); this.close() })
      })
      .addButton(button => {
        actions.push(button)
        button.setButtonText(t('common.cancel')).onClick(() => this.close())
      })
      .addButton(button => {
        actions.push(button)
        button.setButtonText(t('common.save')).setCta().onClick(async () => {
          const canvas = this.node.canvas
          if (saving || canvas.readonly || canvas.nodes.get(this.node.id) !== this.node || this.node.getData().type !== 'text') return
          if (!fontSizeInput.checkValidity()) { fontSizeInput.reportValidity(); return }
          const fontSize = fontSizeInput.value === '' ? Number(control.defaultValue) : Number(fontSizeInput.value)
          saving = true
          actions.forEach(action => action.setDisabled(true))
          try {
            if (fontSize !== initialSize) {
              const current = this.plugin.settings.getSetting('cardAppearance')
              await this.plugin.settings.setSetting({ cardAppearance: getCardAppearance({ ...current, [control.key]: fontSize }) })
            }
            if (this.dismissed) return
            this.save(value)
            this.close()
          } catch (error) {
            new Notice(t('card.saveFailed'))
            console.error('Failed to save card content settings', error)
          } finally {
            saving = false
            actions.forEach(action => action.setDisabled(false))
          }
        })
      })
  }

  onClose() {
    this.dismissed = true
    this.contentEl.empty()
    this.onClosed()
  }
}
