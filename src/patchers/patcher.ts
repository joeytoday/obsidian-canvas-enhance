import { around } from "monkey-around"
import CanvasEnhancePlugin from "src/main"
import { Plugin, WorkspaceLeaf } from "obsidian"
import type { ViewFactoryMap, ViewTypeMap } from "src/@types/Obsidian"

// Is any
type IsAny<T> = 0 extends 1 & T ? true : false
type NotAny<T> = IsAny<T> extends true ? never : T

// All keys in T that are functions
type FunctionKeys<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends (...args: never[]) => unknown ? K : never
}[keyof T]

// The type of the function at key K in T
type KeyFunction<T, K extends FunctionKeys<T>> =
  NonNullable<T[K]> extends (...args: never[]) => unknown ? NonNullable<T[K]> : never

// The type of a patch function for key K in T
type KeyFunctionReplacement<T, K extends FunctionKeys<T>, R extends ReturnType<KeyFunction<T, K>>> =
  (this: T, ...args: Parameters<KeyFunction<T, K>>) => IsAny<ReturnType<KeyFunction<T, K>>> extends false
  ? ReturnType<KeyFunction<T, K>> & NotAny<R>
  : ReturnType<KeyFunction<T, K>>

// The wrapper of a patch function for key K in T
type PatchFunctionWrapper<T, K extends FunctionKeys<T>, R extends ReturnType<KeyFunction<T, K>>> =
  (next: KeyFunction<T, K>) => KeyFunctionReplacement<T, K, R>

// The object of patch functions for T
type FunctionPatchObject<T> = {
  [K in FunctionKeys<T>]?: PatchFunctionWrapper<T, K, ReturnType<KeyFunction<T, K>>> & { __overrideExisting?: boolean }
}

export default abstract class Patcher {
  plugin: CanvasEnhancePlugin

  constructor(plugin: CanvasEnhancePlugin) {
    this.plugin = plugin
    void this.patch()
  }

  protected abstract patch(): Promise<void>

  protected static async waitForViewRequest<K extends keyof ViewTypeMap>(plugin: CanvasEnhancePlugin, viewType: K, patch: (view: ViewTypeMap[K]) => void): Promise<ViewTypeMap[K]> {
    return new Promise(resolve => {
      const uninstaller = around(plugin.app.viewRegistry.viewByType, {
        [viewType]: (next: ViewFactoryMap[K]) => function (this: ViewFactoryMap, ...args: [WorkspaceLeaf]): ViewTypeMap[K] {
          const view = next.call(this, ...args)
          patch(view)

          uninstaller()
          resolve(view)

          return view
        }
      })
      plugin.register(uninstaller)
    })
  }

  static OverrideExisting<T, K extends FunctionKeys<T>, R extends ReturnType<KeyFunction<T, K>>>(
    fn: PatchFunctionWrapper<T, K, R> & { __overrideExisting?: boolean }
  ) { return Object.assign(fn, { __overrideExisting: true }) }

  static patchThisAndPrototype<T extends object>(
    plugin: Plugin,
    object: T | undefined,
    patches: FunctionPatchObject<T>,
    uninstallers?: Array<() => void>
  ): T | null {
    Patcher.patch(plugin, object, patches, false, uninstallers)
    return Patcher.patchPrototype(plugin, object, patches, uninstallers)
  }

  static patchPrototype<T extends object>(
    plugin: Plugin,
    target: T | undefined,
    patches: FunctionPatchObject<T>,
    uninstallers?: Array<() => void>
  ): T | null {
    return Patcher.patch(plugin, target, patches, true, uninstallers)
  }

  static patch<T extends object>(
    plugin: Plugin,
    object: T | undefined,
    patches: FunctionPatchObject<T>,
    prototype = false,
    uninstallers?: Array<() => void>,
    registerWithPlugin = true
  ): T | null {
    if (!object) return null
    const target = (prototype ? object.constructor.prototype : object) as T

    // Validate override requirements
    for (const key of Object.keys(patches) as Array<FunctionKeys<T>>) {
      const patch = patches[key]
      if (patch?.__overrideExisting) {
        if (typeof target[key] !== 'function')
          throw new Error(`Method ${String(key)} does not exist on target`)
      }
    }

    const uninstaller = around<T>(target, patches as Parameters<typeof around<T>>[1])
    if (uninstallers) uninstallers.push(uninstaller)
    // Instance-level patches are released by the caller when the element is removed;
    // registering them here would pin every created node/edge until plugin unload
    if (registerWithPlugin) plugin.register(uninstaller)

    return object
  }

  static async patchOnce<T extends object, V>(
    plugin: Plugin,
    object: T | undefined,
    patches: (resolve: (value: V) => void) => FunctionPatchObject<T>
  ): Promise<V> {
    const uninstallers: (() => void)[] = []
    const value = await new Promise<V>(resolve =>
      this.patch(plugin, object, patches(resolve), false, uninstallers)
    )
    for (const uninstall of uninstallers) uninstall()

    return value
  }

}
