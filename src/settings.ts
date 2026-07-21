import { Notice, PluginSettingTab, Setting as SettingEl, TextComponent } from "obsidian"
import { BooleanSetting, ButtonSetting, DimensionSetting, DropdownSetting, NumberSetting, Setting, SettingsHeading, StyleAttributesSetting, TextSetting } from "./@types/Settings"
import { GET_EDGE_CSS_STYLES_MANAGER } from "./canvas-extensions/advanced-styles/edge-styles"
import { GET_NODE_CSS_STYLES_MANAGER } from "./canvas-extensions/advanced-styles/node-styles"
import { BUILTIN_EDGE_STYLE_ATTRIBUTES, BUILTIN_NODE_STYLE_ATTRIBUTES, StyleAttribute } from "./canvas-extensions/advanced-styles/style-config"
import { NodeTemplate } from "./canvas-extensions/node-templates-canvas-extension"
import { VARIABLE_BREAKPOINT_CSS_VAR } from "./canvas-extensions/variable-breakpoint-canvas-extension"
import CanvasEnhancePlugin from "./main"
import CssStylesConfigManager from "./managers/css-styles-config-manager"

const README_URL = 'https://github.com/Developer-Mike/obsidian-canvas-enhance?tab=readme-ov-file'

const KOFI_PAGE_URL = 'https://ko-fi.com/X8X27IA08'
const KOFI_BADGE_URI = 'data:image/webp;base64,UklGRrosAABXRUJQVlA4TK4sAAAv1wNDEL/CoJEkRXUCbvwrekfM/BYQspGkHsCNw/nbvcAzahtJkue7R/GnubUAykDaNvFv9r2CqU3bgHHKGHIH7H9DeOynEYZHCKFOj1neMfXZ0SmmUzuYgs6P2cH0fjuY11JBq5hO7ejVDqZTnWJ29Op+1twlRYq6rzLHZ6dIkSJFCnjb/mlP41jbjKzG2JjQKAiRUTrz/JCnNasnK3MmnnWm07aORtgyyHpA3/+r2BiOqvpXifW0bRH9h4ZtO9DqlUuZ7LSRz/d9JOv8Ofs/iSZZzKPZdHr9ykynsyheLEGwfD6k6WTvcCZ7h/M/ZfHNZ9ejcOBthqPJLJaMLokmw8DraK6m8fJ/tMJGk5FXbvfL/7NYgjyYXQXEg5nE/zP12uw6GPCaYBQlrD5vRzzHchX9VwTLOJpcj4bhixmOriazeIFImh44snA0mkzni1MR8SQcyJjhZMF1XCPGQwmvk/9qlDKhZ1kyjWFOVvNn0tT7yE5An2AgacIoYQjPflwjQ4IvkyRZxHE8j17MbLpvJtdSZnrARHsmfjHPR7a0rJRBp+liKvEYXp9yHslzZpc31zF1TeYkpfTksYijaPZyuhi9EKPBQJV5Ia1HL6ecaB7Hiigl8fQSXC/gi7HwBKkPitLlWPl/FsgdiZ6TSBw9VyqvhuHAGBM+n12ms7neU0t8hU7TLd8O94qWE26FowTHXomHktQH+tstF9Hs+uqZFjDQBKOraRQvDStmwgi+xhlGJ9ka9sryM+kjeYvLV/ZhQtkY3UQNdzoZs38kVwk8cXqdnJhr4l97DJBpwwTxtclwYKZRy52WSZFv4aucYXRarkmnqxlG/pmBfdyzZ22fPjCj2QIZiyH4mT8ZydGMJxEiplwlna6WVygH8hmUz6BHTHg9hwJIITBjKsckP+qr5cmDxet8he2ZAFWchwm0wMH2qgCkx3IEfuafB8IJ8MRYIHhoAtybYxYhCozqjt1Gl77IQjq1DJcce52Uiz8PDTrUIgA7joU4W9m+NWktQyDMA+wz/wzh2x+dMPhMC2kawB3Hol/j1it8mmGTdMkIhMlzsuiqahIt4S2SIuBeNCOMqN9i19XmMCXM7DTB54HlZG4iWZ/vyZUIxwLUvcHJ0yA5VYL10cJTkzyJArwF4tYSydMTIIwVopO027WvzK5LwfD6iLpUnAnLWJM8bd7u8/3DB617x69O6yepF7/AK93V22Ll7o4aty7KZiePtK0eDh9Stt7WLAfzmYjv6bSywDr6zz3ZgEBeJ8ZbLQLW3F64O5rJ1ts2FfSp1pnfwbjHlqGEwPHtN2mbaGGDVPcGr3V+dpLFv3vJ7UxmXXUiaNekQ3GPHZlX02ucSd1agUsW2zVVuS2Ksmw4ypKRTK0z3e0f2basyUeWnBKWK7Nv3R2vWdWdwBrZUFdGnJzJXjdvBTCmlzJPx0qZFZ2mm7ETIGm9XXGWVtenlU2f/Hw48j/vGsCRzHRrB6Tdntm1B0xTs5n2iOn2jSEii7f0CpsATRckrDZ9WvsmwNPn5c8Z8zr0SrplOxBXi3stxCupXde2dV2VZVEUD+v1yjmX3eGa7PmoVuv1+oXuLav6RdwBUbGOmANRM3smk+JGr5hJwil+6/+3Tk8mW++tga/sWKmQh47ihRpH2rV1VRbF2rk7E8zzGebhpXrbdjp4WiEJFe1MmlWUPzg+YMlnK+Ln7/25BydCAxOGNYA89MSAirmkdTtKOmVQrmYXI5bFwzMZYJjJVutt1e5EQkH4dfRyZt0Rjvu5HONak1nik0BeTj5ZtyuMgq2jouQ/kIrg4KhrdfX2WeRgqFk9VNwyzXAB4Fdnogku+hyjjHGpJyanghoMS0kA7llCHUcMYdP6sGaAqUG3TYqnEBZKp5bMn4ShM1dax1UX7MdNQInoE1JJuSVapGXEYvn4yla/1DIK2oT9HtkqKDshmcYj3+fceP7di97HFZGHtgJL6CnBCpna3xG27b2ZRD9Rb6jFiT4JSJZt6STQvP7y5bxm/QixDFY9l2Aqlp0cp2rH78w4wq/uTDV8KoGimiNjipXJ8XyiVgAWz+UJE3v6TAXrWLqjNWiEdLr0xpyF7dsrZl3zLGL7MOf49UFwiVoBjio8XWLYOcwkzlHgQKTTqb/AgXGtP4JvO/FlhFJlq44DjDxtPQuVXseIT3QCHVl9+DBQ3i/0FjjQ2b79ZDiivhahIxv+qlrK+m4onNt5rweC4owLck2Fs3GWcgYecogR+3rlM+pbgFTZHhm1FVYw5OKsz/2wrBxTtsaUxk8FOJMm7IX8VT/R35TuQpQBLV8cOKXKpMcRErCFTt0PHi6iM/S6IBIvZ7KH3q6WUowZUUsbuV0Aa52706KN6FuSxTbtURfTWYpxJvt7pwWv2wknN0yBbu2FixNEHb2EF/scdTGdyIMzyaAd0POeYcIqM3fyao6ACb48KaIa0yy646EKAxjJxEcRhvwx977nkJPvU0uzVjFTwPaUQKQ5f60pMnOcCuOQLDE/fuR96bnjjnzsHaO4LBQywRd+x3Fq7NOqSNjdwW0Ek3K8MLY/fhVt+eY+LZHQsv0a2N7d++HEcDunK1l3GEdRMTCgIoI1XQsdr3IdJMSkCZFUUqIFpBVPC8XV1CkhRL32hiP+IiZB4sOdeQa1ZQBXM50hXn2pItoTEW9Jb6hjE6tS7egaMW855Ii9GkXHJj1fEFzBTSrTFG+jp10YFqu4nDO/u4N94ZplnxKsr9JP+bMp9s2mPGpqX1OVPmZTvDL5nnHPBm1h6xV4DMjezMiykFMwyFv/QOqqlxmKvI7a7HeMJy/P3Kf7YlNWL72Ne/Uujtsl+u6lG/SX802euwx0uWKoNHXCKWVH11wAk5v3s6te1rR6lUlgqA6/1HRE+x4ka7i8KKtm1w2MMOmubaqyyJ3YQm+nMycQkoAvNKApb8iYC1+bZQ/EAuKHQAnuUFASMQbgTGb5pmq6gV1m12zyDCWykE5dSROShfeJHZRSvGAYm+fkehQeLVnD4ctQV+2+243Q30+ROSCjx90xOOQK00SfNvXhfS0Lytxx65pjlwCyxHG4yT3lbW+yiCZXDBeaGV5ZPGD6yAKNrw4fA7Jb89AHRZ0OTDVdfS8vPw+Wvtsw/FVYie6Kr43wMp7wDuMxGM1iUzH0TY13/YREkCbKG2t82Ppbv+eUYdNy4Rg0aXqRXA+4CW/uNTJ6saFwGt9HYt43kKaJsvII1W/t7o6pD1mqE4AKJBtUGWfNoOm4jOl3xNIHN0Mw9t6np+Dt0tfSge2mzXn6kKU5MSG09I6obXM78oVGDvj0m8fS9wNzKrFTECSW+ZDzQyEMD15whPF3/MocmNP/1qvOCfvKBeAIwsIoMS40govDOO2gIxKkibJmYKmR7XymJTkhKkO38JL84Lb8xxzDo23BR55YacOro0XWhxnSYnY94ctxVWUhr4DwfTkArI8BpnFu56/as5yFiMP9Mbbz01Zda6bDlQ5obYjI1+XqJagHd9oSlN0i2LS54mwXIK8EsHw9hMfeXJnZ0FByffBwsbUhRvzl3dPAToPRrejOv53opR82CHDH1VaB976AHphnGNkpNO/UditQAbNrphSaqKbbfvF0IupuC99YHQQ81SpBe7gO0AffZuX2ozo0B6odwNoQlO2cZHvIpPcSu0yPSy+QhCaQnKRC67D6FjZuO3XoXqf2DFgbgrC9I+3RT2Yj4AQzP1QYgGx03ykeS7oxe8vHjEax57CvDCgaAo+kq0P3lCkFnABYD/IwgxgqtFbPmX3KMLk6VIcKH+z+jeeeyGgFTl+tguTGOwwgtllslQ+13Q7MfUNr3D6wibo9ISjD1H0XiJ9t0/KhBQEgI2mlfiScduiky25jkmz3CCIbQsihHx4Y/v5eimyFcN3cDRYqqB76tJuRFZ6hDduNTPHDXbwn/iKHlJIwe810GfOF7oETZybYM4thpUA4NwELG7YdVjp1HfcrDcHtOVPLyxRTrCS3hrsm7AkQKhLdhk0DrbxLeGXiWcXtV5ennrXW9YqD61f6Xvz+NvaH2rpevR7S7l6HmKnFocYm6K4WQoQlpXjnlpq7vnVZGKMtHVDngBUcXdrJfQttVawy0l02VG1q69sO/ZCx+8ER7Dtxdg2hcejACzuC23+mkt7MkTi1DrhoYhyaJ95QOIPYIql5C+sy5twNYIKKCDyMmiAz70HjhCVUGRC9XsIWTWw32rBiPv+VfGPPnBnUo1qlDE9+PWHiJahkLyRrXWdtM0VfFc/10TXjfRfVskT0DqadEZhfJeCTyQy9bWdg9FMDYn30TKwZGhf2+owQcuWdMk2m5w9/WdlDLVnUVyxogHrUWd1pfYv0SfCIV3Vn3XIJ+QrGBS4qsRiJV8G5ZJUS7cTw5Z+//+HHn25ubn784fs/f8WIr755/+OPz3/tTz++/+Z3XwihlBiHaSnKzN7AVP6EqFKGxKJhEL2PHctiTMidrvVUx/ioQ8qH3ELt/dX3Nx9vj5iPP339JQN+9/fjf+6/fvyzwEudJ+dNKpJMUci7tlO6T7uGYDW2hi1LLVJzmfaXj1BHEe2DlSC5F8AXf/9w62l++jPxz/3+xv/P5cajDAOr4HoBmpjcPULtw72mY+WtKSE3epBVxAwCZENSxxUblFd+9/MtxfzyNeUk9JH25/JiJVNHb7mEi9DEJFThVUutiUdj1DJTEFK0f9EN/6tkN2b9kFvuyvxeWU9b8Y3mu701lBXK9yGyudUT0kH58Q6gXNPKTB0onGmNvv47oBzGNa0lrHeGSnnxXNgzmB+8z0IMJyI+SJWfD3KS89KiUXywCSv0jYQz1rknckiM6/HUDmMAZAlNlogQ8st/3d7eipwZ/vbxlsf8nQ1Sd/FRyQV8QAGkH8/YmHV5BokVezZq1pi+/5wtDtJxTGlE0Y5XG8afhucyv/75CP5xu2d4PDkhUOp3cgHtGYbXlstX60g4FSJQqeWWFQcqzTCeqwMHIjA8hlZeUvOPW07z9UH8eHvLuHzFBpkw3jmM4YpJ9vilLHE+gMuJKWZoRFyFvMSkLj6RBpnQpnDXqXM1240JjziJopIPP97ymm8P8N9vblnNr1+LI0v56fiajJ05YAm0c4rZCp/piwtzz3R/ZCVlkX/KDo/U6H5z4K7v+FdIKSHfS/k0PyIqb1ENrxVZ/Zn/72WBlLOROqE2WiHa8q3O4MlfWlr93IS+Eh3WKTsFua/itM59v8PNXlWCjfQ652QnN3yv8puvXp2G+M3vpJFRsplUBagyBsXABrnBkyERzIRrbMoaVnbHaxVZXnLwB8JECi2/5WS+Sf29v34lXdFu/dFK6fltzH2vR/U8w6EBrcg6bIhH2zZluTdmwpptcFcLOnOyEMWfbkXMzTPn/lbE/PIFGWJJvZMSnOdGBdI/NuaHlBKGa452X6Zo92p0wFy9mjPFBKHzpRahMY8qw6tjNOBExyMv/0UGt//+5Uehv/dGGCv2v9eZGlfFYFcmjF03Jk4BH8P4toIR6/C2LjHRqgI9Bmz8eCtlfrmVMt/K4i7ljiqzNK4tj7VgCZeEKT7lnk7BpdQlwWoAWGKx8fWtOvPrl7LYvYCVPUvmspgSiMfqWji9llJzvzqcxCJqbiUADLGi4PHTZ25kURMoeRm0psTAaNXswOcVXwWi0zJH9DgHhR0WHP+41Wh+J4qSwHmTQW0IdgxvpLA+whMhYcwOIDMmHGBKTlozLDi+vFWJG1FswVAaGkOpUjmHxD4GGwrTVQyqvmpah99BdCYNln10OpIowLCxU7+ttKVJW7DEm6LG0esVDhLkAQ16hyIBj1+U4sYO5FbgfmCU+ny2I+2y/AxxbA48FYu8D3CxPJMHRyxaHTOwsrLxWOfM+UAWkDPV9XZ5dBJK+wCEyR7Ax41a/GAGMjvUVhlPe1ZEPhxhUsUvOx2oWfQZBjME0EOrxa9fWLGbEffYzGBLu/iIgJ4H7re65zD4HAAM23o35VBhobMBLUMg5Sc7baRxsjdrbeCoTNgNPsiNYvwghwYLOyO10dUEMuK6cmESBwN0lDZElIDjo2L8Aqi/uhJBa0sPDsRbq+snL/8BgPULKNr90PjjrWbzBQPY2484kfYmtYm2s4DtoMz0E7ju+SbAwfeq8RcprMHah1Ym9nq656fc63RCtz/HdW3bSUV+jtOfw3+oxndSqNiL07UN6quyQ+CqTGAonkJ4mdzO4zPfxRAGGDeq8SMd7IRPK4NCO3KWsseZINfvGxSAPkXmWXEiz6DTiAcbGXxQjf8vhDV/ebplv8iI2qbV1t3rf9UzeGjZx+MkOYVArmbwwuwv8VY1fhFCjda/cW6BtbG/iUwi/3X7ldzXtzrMPWeKKtKKWz9sq6ZN5fGUiU6U47KXcCsDJ5DMGiq0K6Mb5EIM7LVrymLl/OdT8DkTi+fhVCqtEAfcJRmPE54ox88EUdPwziiwdHoANPwPp/xynUyurU7LNaGzq0efGzLVPsV8623TiaDkSmEN2+TCDvsbW5pmi7XNTVw34HLNcPCGwrTa8mfg9mmlbQ74kDqbfuLaZdTbcLScJ9RtuW7L5drhcHCtRMbAxMwV0zZRdDwSEoyJcmTo9bUP4ToJSv7eKrhuYJjrnYAxc7t74hvoh6qJomO0IBPlKIaKht8YBSeTB1shyVBn1xu9Hmu1JVijXoHQ1bhrwh8Foj5DxdKg7JITpWG7/crOG79PZUrUlgr91qZOWvm/wfQBYDgtmmatjY/Bhti2b+eLyeGrJbHCYn2YWmbwME6oOrozzg6cLdjiKuK5nUWz1vZITxpbHHFqsBS6CtqWiP/chzldJq4khhlSSzWVaNWnVaZrJVgX8S7D5hmkj1YxXiqkE/JUCAUR/0+3XjrjNPXlVSpXolaKwXm3I3ZOF1Xlz3pAXrqV5tNnA1hvbP0v7iAyXp3CsnZktGL/9Q7Zp02dilaAd2QYpzG2F9qUwNCtYVqT2trUeBUzl5IjnuI0j/xGNX5PnjoV3t9+wok1gKq1WrtCS1xBdY3dZ0TqzLqiU412QyGI+K1qvFNxxzBbOlRbiwe0VkF/b2uT6j9ZB8ehzFJq4IhTL9vZ1a/aB6gWeoTvd8cPvSPB8U5I5m12DvtkVdmlK7CFK05i4i0PCeFGMX5CQsnXDwFwkhWa9GmOATLZt7nFZvN3mV0sSllZBnFzDjRMhPeK8Q1Sb1aSHc+XGnVWTdyb73tMHXbV6NEumeKjMA+QNq0eMdAwEf5o8yuMqbqzBikznEUosGtPGXRTG2GCHYt+WRM3F6zddnfkF3rglS2p/yxjcPfAi51Nk3oL3hlGaxKZlOHxgnY0lZjED7k/jJKc/4CDSrb7zlJ/92Tmzjhqh12SFza1jG196Te0wCOR4QO0Vm1+BYOdcHfbpWU9++c2ocJmKGY2KQ1sJVWoWPlsryNlRT0gbxq7zSvhqVmgsKUJr5KbeS9sAMtkk06nDo+N2tLmjyrgzBvVwKadv8Gx0p1tFwqLHRtfYfsuc2gqJLVLppiCakRNSB0mVlIXVfiN1r0V2LvaJty1QsqrRuUubCqkMQQNXHpY014YMY8j2CKVmH9qsOsBI2x6q0er0GBz1JxNo+Ct8JSKU5Lk/JJ5HMEWBX6nwN51nLDprVZWocJug5dp51YylcewczWxoDT87uSqtzdWu02GcO2nQjFBqeWuKMwl0VPlykA85XELy9qZURqSpXI3wvNHo92SrCtqGLKOK6R9AWtssbwpjWwA56/J8yLcEsO3Tzkci91uTR+SjHqIcxwaCHza1Luu69oK69oc4Ao7rU2j4D1eLQN9YUhqSObkKrh/NNitMvp1b03DXYUm0Ge5oY22QCzKS2i0ZqEDqQBSAi6YL3jH4VirutquGfTJOGGV14N8bbSDvXegpufRABcnCUUxvRAsld7pUnb7IO52jywDA+OEVV45Yr8RGxQap4cB+N3dkzTd/LAhqVaZouz2F/E1Hk4nK6zyyiA7Ai8xsD0UBBpNv6n2OdKO516oRW88+4OV+7RrpvbVvLDKS/6ggJeif7E+mhxgA14L3Aao48EfTfRrtxlbdyj8MEgrpiNBtPZzj5W9mr7cWCNKPf3IuEuaQozoHSr/h3UNTbqq4COJGwnhu0FaMa0whX4cWDPb5bBF+51JKHxD4p3wQ4nb7Obqpe8/DfHrDpuXaVYvVqz54GlgAaQqKRwJF4BMqhBqLj60DKRQvrMEpSzLk7UJmITgvGbCu4/a/YhpCcJen1szbLQtDTWSH55aNXTLdGdT3861VEgB3eqE0hPqgzBb+mszNGEaUDtIyDCmpWiJywksoRRiHHQVOjPqssQrFKwoLU4SP2wow2+0Isx3TC0jQe30zB6sBCHaziaFQgFNOuX91tLdkaZsIuCkGjO+Wu4NPP6dq2Ukpg1hb+0Mi6YBqUA29G8ViYlcQfMwN0eg/ayPyKH0FJxLTP9Mx4Z3H8DxM9PBp6AZNKEN8sci4XkBUqwN0G96q4Mskg0SnG+Fa6asJ4IJJaqUpM5pQQQfvuBqzi1qSX4m4W4tCx6aEP6mMjPkryG16ZUKm6VzTZqKDSevz/lHCxRhNpDX0rug3Tqp7l0AsWY4XUNhg8zxHuQ9oZXOWsBfkqIqAMat/bUB+m054uBIwoQKi4TnD8j3/wWFFvBLwN1EYX8+YGNIutRIhTBa1veo+Miotir1DeW0jzY+o8GmXXLBPenoFHQujvKRpVZE2h2lXbB/DBTKji1hPOrql4+/ZVQ+FwpGbJc1pQ7eSfsu+tAigOYg6eeVRrjHq9fYPwYKZccUQ6fzvUYrzhNZ7aj3b0GF9l3wvFUA1ak8Br9hg3uchNXwI0SMWQOuB8qXDy8W+JWsJN9vDXmKENTvgganIQjq95ZbeItGKXopkpC6TCxAhqP+XnWT0AxuDrfC5Mw4rLDl5hpuxnyD5nfsmKyIBbLh3MobAlNh2Q64F0CL+4prGe/JZGIU7io0tGxiDpwDy6H5Gyv9TBd6IgWj5hakgB3MbKp/rbcDhw37zIyxPjArU/3dg7PScBs4zj6UDssOsvqd7bBulQZXCtagIyZdG2yQwdzIzW8/wOBf74AHfeE4hn8Y8Uyti/53kKLS9Q5Ys/PI9CCvWrQ8ITN3MxomvIRjy7+8Q1n+SZotR+lyO3/+KHnt2cwfJr1DdQe7+QiAlPXXJQCYErNuZcE6ZvsaWiaJ/FARIuU3v/kZpuWY+DZhGpfY7VlEhyl9rNWwwz7tQLNCKezb4vIX8T6NUguWngmGeAuE6qL/+DX/oTpGH07LMNg2k96hkSXQwV3nO1l1yHNX2GKEEhHugCOlZZNz3hzZiSx/+YAgLsfbzjet2DPmMzcMazA+4prkAvdCUX8SyrZMfVuWcqqscCe5AkrPxhO0Fza0TWVR/Ow9ybSCxZi7L9tUcqIrYj9kVjhgGb8h4AFClYN0D4nsPhVfIuoK6OThOcZ2nZgRCdoW7dYm3wv3tYSznRdl7XHLg3Q1GCY4Kxxbr0dAMQ3fBUOzT5smZf8d03StKcWU+ntqZISdhcw3H3CDsXKpUoz560g4YAnT10HIq0DlQyXDTfbltKqA+/RSNAhdjaIQSiNQtEsOD+oMshdwP/TLO5m3/UFoopdXOMzG6dkZCTZ1G+BDqUsvEhbrag97vc2XxSGzKcu6BvhZQNvNJ3Cf8uVzMQET3s0slfsav5Plv2PortbcCOa+c+FDgUVarIW8eAhX6tuq/9Epmo1EUuH8WST1oCUi9kOaEe8xWMWb3exf+gspdIfyyPQYcd/ZhLM9XO7fdqg3yZQODDAl3Feev/r5Qg2B7089VUD+aizvWX353s2L94wxE9UTypxUGQEuOUkDdiuI7SNQ5hvYCyqT4fVvDGsNLj3JaBLpJurJ6ivmYmyHMf8cklnldCg3cFo1bV1hSafW/YCs2FT1gaf7xiREvjuDpoX3fL54ruP1XbLP+Vx1Z5aTmfVbrJuACmb+BywCNdISldfy7obJF9AtOKVqscgcDZrlrKxCrQ+YaWVrGWhtRFuOO0EDlaF//DPoTUR0OM/s39gLzZ1ZzsYq7PoBpRScJsy4T2id+Df57p9kWTmku2Zbmy6l5kDULKe2CgMFuOhHdJ6gb9YUR9781d/zX3/AvecX6R9MjqFDB0tMhfuBmBoyiM9mdiHHB30zzaiO9HuS+XRw35VD+hn0ZubdHJezMOAW3zfZe+yq4FFbiMg3MNFB3Onnd8BVtVo2HnUNv8HS+YNNaNB9Z0xPY17TVzjClloGng66+uEfjnHkb573EocTHCvWcLaUnutru6jryiak2DhYLkQ0z7YXwND9yMTz0Av4itm7f3vl8fHm/TtsDYcnasEyieV/8LSVXbdivzMJq4EUJOpwyRgarQFIGRD7fuQq2gu8+8Mf3sHcRoTUoIouoiXCz3X6YBg7LOvVV4JJ4pFKLnoNLN2FDX35X7b+gJtrCTcY03yYG5zY5RQWoYXl0vlyZmLvlZ1a4X+BjvlRqRH7ufTJIFT87gXx4SdlV0w3Bo+gknP0xiazS2Gck+pwsechdQC1ajEo6Lf8WGBuJ+sM/R0X754IU3APhNqwuVNIDUIx8L0OfBJdiJH9DCXDFBOpfjie6SyfsDtrc+DuaHUVrIeF59LanyshN1IpffL68SN+w/7aJc9zKB1hYkDHcIpOUq54ZsYy5h9ba2UMSgE5SIL1iyLuLCOxKyNjjQ9PkvzlRcBC8V+OZ/NEta7DgEO4g441U3YaeTO3jfRqaFQSkEu6yxrLNE5SteDuV8Ojm6t4PpuOLy7enJ8Hr3Po+fn5m4vL8WQaRYvXpYFmOCLrkDJYkgodyzMup7wzMcLOaXLPInMnOyM3UcntQuXvgZKhSv/fTKIlW1ti1Ef+hMtJMwt/hOzUET90tgRsgqIbUtZvgXkOoMVrpBIOspSexktNbYm3XA8/XOQvtzIwzANNCsLzI03ZoRBT5pBpLc2M2VvnU+e48ATkgy/D3JZYz6O84q3FuzKmm1p2DsgTjEtvTbtBQYsZ8cYW7PB/HRQ9nc0XflDWlrj2zFCMTktKtZ151mH+pmLnwFyYapBDVp9bA3XSZzrxAFlKK2tL3HgWlL4OexnoLFhqER3Da7N+HLF60PZe4Frrw58JqZhS+eVmZW2JW88c5en472JZ5DWZowGZfsfAVF0DlfdTmxyn9kf6CRDR+IGpLTF6dw6sTkOciwDLrEsx3bMpcFQtVN5/skn69yS6N16VrYQspZW1JeasSc397+iIuNhl7zqiiyY4X+Ews3LIzdIOdNjPYCl/Z/MaSukEWzHdsT7SdCOCF20H7VagrdsEU1pToGQ3KKc9HLFtMV9ofWYWahWltB822GpuMffTHNfeGbAIUHA57s8VuER/Fh4KSFq7NMNVtK1AgJ15ltLcIhtIwX1COqEKnNzcTim2d/SzHGzyPYfdMQObISd3hNCzzA3PtGKHKCiMdf2ulCXvkyOVBEK/0lClEd2agZ+Cm3wvYXdcoRXq7WHHMvda7w/VBtmIi0lkAy02D3mZzDyl11Yfdo6D44vLHJrA7rhGG9PzkznjhH5S9eTiYgiwJTIaVy6GFptfkB8aT1/2hilRVCxfN3CpFMFqphdoFOLamp5knL+rF04WlV8pzXq8sE+Yk8hzaLmhf8IKg4mo6YQJbvOFDVRNLYdMcbl+1Lp+Jl0mAbYG5dEFctukjP9hsR3J9cy61uNZZZJP/irwz3baQNXUugwxB7cmqLhpesYFFQiwd0wPpmeCHNXa/4mc5NqFuW74pMtXphnMNbJ6RYpVU6sg+d4b/fvoilmBAJuhlCbdyCIItgKPqOpsIDjQZAdypXT5uX5ugX9pX+JdW2DR6zkiiZhm+t9C1aN/xiTAxotrzlXydMj93XBoBcnN8u2qhd+L54JNyH60u7bAyv5dhlg2N7r3UecyCbABlczYSp4MAzvvhjuMXvyVwzXySu2YxDj+mICzf2p9F+oTOLPeq95H2IVVdcCjvpd8Pzw8bshLpnJQMNOsa9R4nPhd6C6Bfu/mAJOs2wImumJghtdWmnBDVXVI8WYjhvFBAcANOeV+RHIlyi9Xd4j1eYC70EVvvzBwCGWpnxdU7bPV65cqcGVKSIdGfV8wPg8buNqrc/5HGlhEE/KhgfJpngcYKG9n+L///gatptZA6kxsjIlxECvCHE6AzVi9PIftgqmVKjHjAcBylz2CeKQvY+FGsBMFybOFq6ltIJk6K514Iko7NQvON2h7zhhFNjnqKyEnwSTPmHqod9I+9UPGO3QBzEB8ZF2awdXUVohssk5lmC21QqZZcF6jfZQxY/4tUV+5ZKq60p4EY+ZK3YPYL6DS1dzP5nnWavqN+IeIp/9y4Jn54Y6lVRnIhifk+xyshWjN+Fj1LlBfqAVruEuwx5Z1/Vi1HfOTbu9FH4i2eIl1PGANNV5NrYXUQqkUSsyJlJvuqFIdQusAVHLeiWWu1088ONotjq3WRVk3/jOcnnZdW1fbYuWEjmnP6imSYt9NvJpaBdmXR2nGrFNHCh/8FKAKlmOlvkeYulMr2QcYO6LR5jlECXLQQPx8B/CWZ/wBOeD1LTeQ1b9HjYowFjysuBHWt3rPSn3PMDe3wk13ptROzWwxFdd/DQK85LxFzHg5BFRHXlEfigf1O9ZYaSRmpijFt6UFyGNVD2gB8l3WDZd6FCwGGaBsOV0hIlW0PA0s8KPd2C1WGiEcMCL9t5J/3sBH5vymcZTf7oUndrhItdxhaueE4b3osfJ+Rqkmrpip7zHiZi2vNLgcDgwMlVUDPZZjLKui9V/M5X7gv2ix8n5WqSZWzLyjCLFe1/Geos1+Aq7zjsUq2swlR1OBuWwHhEWHtcOP8qxcqRBuLT1RAbahn4M90/KFAb4sVtNmK5hEiIs4G1Pp+9QIusQqVBNVCLdGeIE778d0nn+xzDPveCzsJpbTDUCXVnHlLaPNLM2ZTnOOk0xqduHWTMkkb12fwS2DUjX7nccq22zlXMwlo/YRjZ0kOoTUYJdqYsdeo1kGaE7nvS2zmLRTVqbqLNPQGO+lxgIJutzTnxATpZKRuSkPwFya4YzMRYCiLPGuwiS3ENXeFKJMB/os09AYu0zWRZvDgFptcuGYMB6lL6Ds3PlhKNHYOnVoV2ECXQa1tvcougG+lWsbXyEQy+wpX/SuK0qF1bKJNQ+YYIuiijCj6uL4VhWxRCuLM9hlUCsKkG061v+nIuzAbLugXKGllDsebUpN25SYHOx5IBRzEBZoIqMIngu1toX4Otn/VUzaQlF9ngFjJTVFEK+ccZSaToL80OfpWjLxZv5z1FnIZOflAKiq2OApIky4Hg0biagF7/ffgspj4E0xCWV7wEK9ZjwaLF8Aq1AiqmJIAGPvAgJHxyiUbzmrPeps0yL+L45AfhUl8Hj3SxnyQxFTJt8NAKxGiaiKawzHMDTaCrP4nAds5U6JGjyvU3Oe9MtlgKBEVgtebxzqgskpxixl5C3ffyaU3p3ZGKGQg3L2rz7fo5CU0ufpJGRM9Xj32J/lVcp5O2aqSh7/BfkukUqp297A131w9YDJWrSZOvn8HHPIbAjtAzDstfyJdszb22Ge4fCAPB7uJEPksqF0rs9qmX4kV6Dnqa50wiEssHK5usukq2oXPDIbhMV1yNWqKXMSbUuAl1zB/b/9E8YKU6ik+NztYK+PltVSxyNF3WX37cAgyzzgQWmaLpL9J0RK7xkrdOQSVD4Ue0W0LnIxmv9+c+BnnFYXDKPHi84xMa3lVlAHBrUrnJxkREVswMVhLWtDcTlWydcfKHiHssuJTDJtOJ4Tb4hnMCqY6XzeJymeTo5kHl6xrMiep6jzEcM+myAQVj+DtckkabqI7ZCFxSBb4Eb05NuNZJwJk01xn+e5O272HiH1sqoPPx2QKnzBa0Rd5aQqwsnZmEf9KCNMeZj81KLkTHQcY9Vs+GKNcOSoupxSTPPxdkWZpXnLrDnYM/83ZcHMpv+6mKbIKCQzraI2ZivTeR8KsVHIejW28v4TaeqAioq1jjHW8Ryay5fWpZPS3osxOinsCkERB9apeh4CQ7Mv7r9l1q7a5O7QZHxw1GxCXtborn59VC6nyyuSJBR4kKWK/JM7/Fy/F75PDjpDyzE7HKIggvYMfQHItpKAQUVUhO6bYpO9Pf9sjc7Yaj+MuTAR+WpTnnzNxpXxvgiMHP1mzZP+G3LzNDIy5yJIkBJoU3zyqWLtJSiOPm9s3kngZtAVRghmZoL/RGE8SW+m8MmitfZfRiltq02Rv5h7nnnnmrH/R+1wHHW5f9R79Bjntwq+U28/R77LEAsT/v+6KXbyIwl1YWLQI15/BVbrVJJA9XUoG9mwchGb8P/FBFWuLuW0FPhKtOVEEwE3N+npE8dKJAleAjWDYxKFBqwZ8f9AhZdCEfP+5Ehq0cZDNcdLdTEdcUJ95wZRqH3NChMBFjxwUQyPMmW0CDytMhPVxfSUEQZ0RRSFutfsWNDoSbxQYSKWWHrqX/FyBPPJCgmwTOWERhcqee8Ta56n6ggrheCFChN9EtIwNu6/mEF1MT1VJ+Aw9t9sMpwaVArNA+AUEoWYB5SM0fcyblGdn6fGyi2XmoIHl3E/JdKLJUlJATTpJRd9osbAzxBXnZ+nIHuo+pImoY7a/Myu1JoMhRnluCerC9L3FIfAa323OlwqJynH+mQX47AXfFSWAMEcly06IaeUC8i1HlzGS+VnM53Vq8X0DSzZ/+xjYSpFljAnE1SNlMUYfa2XqLopQG15bDMvNIkAo30zia1MqlPoBJKMUTVSkmkII+801kx15+cotFpwuYjGAm9DmyoDS8ufMXThmoxhW9fNxwDh1Sm1geRp1fk5GRsuuFzG00vpoOfjA/NiYusKNMmcRCHmETHMRwzTlE1ZnEJ05+d5aHsFaxnPJhcCuwZvxtNo8RzW7HQaQvMf55ewKS+JLgORqpmRPgQRI39+1k2oXFuQEf1nwuT8nEYWnF9cjqfRXG18YEmFI9OfTw9nRLAy/WIuKEmZXQS8dFxkfxKJLnSX0lHYK8zQZeJnlv3z/+Y3H4c0ocJC/qje4MorFjMWnkxwOZn3RVKJx3yyXfVH/V8Jk8x9OBvnl5NoAXtU55dAfJDF/KXeFnjRBm/Gk8gsbosk3cVB0yGriDJUuy6mi7P/kpjlIp5HeyZeJIiZIY73jmm+SEDz2uLluPaPLI6TXiqt6HMddT6eJQpolclFQKpi/Y+PiZ8Jr4vz4BBFdDmZaarkLObPjK83R45ahOo7Aw=='

export interface CanvasEnhancePluginSettingsValues {
  nodeTypeOnDoubleClick: keyof typeof SETTINGS.general.children.nodeTypeOnDoubleClick.options
  alignNewNodesToGrid: boolean
  defaultTextNodeDimensions: [number, number]
  defaultFileNodeDimensions: [number, number]
  minNodeSize: number
  maxNodeWidth: number
  disableFontSizeRelativeToZoom: boolean

  canvasMetadataCompatibilityEnabled: boolean
  enableSingleNodeLinks: boolean
  enableSingleNodePopupReferenceCopy: boolean

  combineCustomStylesInDropdown: boolean

  nodeStylingFeatureEnabled: boolean
  customNodeStyleAttributes: StyleAttribute[]
  defaultTextNodeColor: number
  defaultTextNodeStyleAttributes: { [key: string]: string }
  nodeTemplates: NodeTemplate[]

  edgesStylingFeatureEnabled: boolean
  customEdgeStyleAttributes: StyleAttribute[]
  inheritEdgeColorFromNode: boolean
  defaultEdgeColor: number
  defaultEdgeLineDirection: keyof typeof SETTINGS.edgesStylingFeatureEnabled.children.defaultEdgeLineDirection.options
  defaultEdgeStyleAttributes: { [key: string]: string }
  edgeStyleUpdateWhileDragging: boolean
  edgeStyleSquarePathRounded: boolean
  edgeStylePathfinderAllowDiagonal: boolean
  edgeStylePathfinderPathRounded: boolean

  variableBreakpointFeatureEnabled: boolean

  zOrderingControlFeatureEnabled: boolean
  zOrderingControlShowOneLayerShiftOptions: boolean

  aspectRatioControlFeatureEnabled: boolean

  commandsFeatureEnabled: boolean
  zoomToClonedNode: boolean
  cloneNodeMargin: number
  expandNodeStepSize: number

  nativeFileSearchEnabled: boolean

  floatingEdgeFeatureEnabled: boolean
  allowFloatingEdgeCreation: boolean
  newEdgeFromSideFloating: boolean

  flipEdgeFeatureEnabled: boolean

  betterExportFeatureEnabled: boolean

  betterReadonlyEnabled: boolean
  hideBackgroundGridWhenInReadonly: boolean
  disableNodePopup: boolean
  disableZoom: boolean
  disablePan: boolean

  readingModeFixEnabled: boolean

  autoResizeNodeFeatureEnabled: boolean
  autoResizeNodeEnabledByDefault: boolean
  autoResizeNodeMaxHeight: number
  autoResizeNodeSnapToGrid: boolean

  collapsibleGroupsFeatureEnabled: boolean
  collapsedGroupPreviewOnDrag: boolean

  focusModeFeatureEnabled: boolean

  presentationFeatureEnabled: boolean
  showSetStartNodeInPopup: boolean
  defaultSlideDimensions: [number, number]
  wrapInSlidePadding: number
  resetViewportOnPresentationEnd: boolean
  useArrowKeysToChangeSlides: boolean
  usePgUpPgDownKeysToChangeSlides: boolean
  zoomToSlideWithoutPadding: boolean
  useUnclampedZoomWhilePresenting: boolean
  fullscreenPresentationEnabled: boolean
  slideTransitionAnimationDuration: number
  slideTransitionAnimationIntensity: number

  canvasEncapsulationEnabled: boolean

  portalsFeatureEnabled: boolean
  showEdgesIntoDisabledPortals: boolean

  autoFileNodeEdgesFeatureEnabled: boolean
  autoFileNodeEdgesFrontmatterKey: string

  edgeHighlightEnabled: boolean
  highlightIncomingEdges: boolean

  edgeSelectionEnabled: boolean
  selectEdgeByDirection: boolean

  mindmapFeatureEnabled: boolean
  mindmapChildNodeSpacing: number
  mindmapSiblingNodeSpacing: number
  mindmapUseNavigationHotkeys: boolean
  mindmapUseFloatingNodeHotkeys: boolean
  mindmapPropagateColorToEdges: boolean
}

export const DEFAULT_SETTINGS_VALUES: CanvasEnhancePluginSettingsValues = {
  nodeTypeOnDoubleClick: 'text',
  alignNewNodesToGrid: true,
  defaultTextNodeDimensions: [260, 60],
  defaultFileNodeDimensions: [400, 400],
  minNodeSize: 60,
  maxNodeWidth: -1,
  disableFontSizeRelativeToZoom: false,

  canvasMetadataCompatibilityEnabled: true,
  enableSingleNodeLinks: true,
  enableSingleNodePopupReferenceCopy: false,

  combineCustomStylesInDropdown: false,

  nodeStylingFeatureEnabled: true,
  customNodeStyleAttributes: [],
  defaultTextNodeColor: 0,
  defaultTextNodeStyleAttributes: {},
  nodeTemplates: [],

  edgesStylingFeatureEnabled: true,
  customEdgeStyleAttributes: [],
  inheritEdgeColorFromNode: false,
  defaultEdgeColor: 0,
  defaultEdgeLineDirection: 'unidirectional',
  defaultEdgeStyleAttributes: {},
  edgeStyleUpdateWhileDragging: false,
  edgeStyleSquarePathRounded: true,
  edgeStylePathfinderAllowDiagonal: false,
  edgeStylePathfinderPathRounded: true,

  variableBreakpointFeatureEnabled: false,

  zOrderingControlFeatureEnabled: false,
  zOrderingControlShowOneLayerShiftOptions: false,

  aspectRatioControlFeatureEnabled: false,

  commandsFeatureEnabled: true,
  zoomToClonedNode: true,
  cloneNodeMargin: 20,
  expandNodeStepSize: 20,

  nativeFileSearchEnabled: true,

  floatingEdgeFeatureEnabled: true,
  allowFloatingEdgeCreation: false,
  newEdgeFromSideFloating: false,

  flipEdgeFeatureEnabled: true,

  betterExportFeatureEnabled: true,

  betterReadonlyEnabled: false,
  hideBackgroundGridWhenInReadonly: true,
  disableNodePopup: false,
  disableZoom: false,
  disablePan: false,

  readingModeFixEnabled: false,

  autoResizeNodeFeatureEnabled: false,
  autoResizeNodeEnabledByDefault: false,
  autoResizeNodeMaxHeight: -1,
  autoResizeNodeSnapToGrid: true,

  collapsibleGroupsFeatureEnabled: true,
  collapsedGroupPreviewOnDrag: true,

  focusModeFeatureEnabled: false,

  presentationFeatureEnabled: true,
  showSetStartNodeInPopup: false,
  defaultSlideDimensions: [1200, 675],
  wrapInSlidePadding: 20,
  resetViewportOnPresentationEnd: true,
  useArrowKeysToChangeSlides: true,
  usePgUpPgDownKeysToChangeSlides: true,
  zoomToSlideWithoutPadding: true,
  useUnclampedZoomWhilePresenting: false,
  fullscreenPresentationEnabled: true,
  slideTransitionAnimationDuration: 0.5,
  slideTransitionAnimationIntensity: 1.25,

  canvasEncapsulationEnabled: false,

  portalsFeatureEnabled: true,
  showEdgesIntoDisabledPortals: true,

  autoFileNodeEdgesFeatureEnabled: false,
  autoFileNodeEdgesFrontmatterKey: 'canvas-edges',

  edgeHighlightEnabled: false,
  highlightIncomingEdges: false,

  edgeSelectionEnabled: false,
  selectEdgeByDirection: false,

  mindmapFeatureEnabled: true,
  mindmapChildNodeSpacing: 200,
  mindmapSiblingNodeSpacing: 20,
  mindmapUseNavigationHotkeys: true,
  mindmapUseFloatingNodeHotkeys: true,
  mindmapPropagateColorToEdges: false,
}

export const SETTINGS = {
  general: {
    label: '通用',
    description: 'Canvas Enhance 插件的通用设置。',
    disableToggle: true,
    children: {
      nodeTypeOnDoubleClick: {
        label: '双击创建的节点类型',
        description: '在画布上双击时创建的节点类型。',
        type: 'dropdown',
        options: {
          'text': '文本',
          'file': '文件'
        }
      } as DropdownSetting,
      alignNewNodesToGrid: {
        label: '新节点自动对齐网格',
        description: '启用后，新节点将自动对齐到网格。',
        type: 'boolean'
      },
      defaultTextNodeDimensions: {
        label: '默认文本节点尺寸',
        description: '文本节点的默认尺寸。',
        type: 'dimension',
        parse: (value: [string, string]) => {
          const width = Math.max(1, parseInt(value[0]) || 0)
          const height = Math.max(1, parseInt(value[1]) || 0)
          return [width, height]
        }
      },
      defaultFileNodeDimensions: {
        label: '默认文件节点尺寸',
        description: '文件节点的默认尺寸。',
        type: 'dimension',
        parse: (value: [string, string]) => {
          const width = Math.max(1, parseInt(value[0]) || 0)
          const height = Math.max(1, parseInt(value[1]) || 0)
          return [width, height]
        }
      },
      minNodeSize: {
        label: '最小节点尺寸',
        description: '节点的最小尺寸（宽或高）。',
        type: 'number',
        parse: (value: string) => Math.max(1, parseInt(value) || 0)
      },
      maxNodeWidth: {
        label: '最大节点宽度',
        description: '节点的最大宽度，设为 -1 表示不限制。',
        type: 'number',
        parse: (value: string) => Math.max(-1, parseInt(value) || 0)
      },
      disableFontSizeRelativeToZoom: {
        label: '禁用缩放时的字体缩放',
        description: '启用后，缩小画布时不会自动放大分组标题和边标签的字体。',
        type: 'boolean'
      }
    }
  },
  commandsFeatureEnabled: {
    label: '扩展命令',
    description: '为画布添加更多操作命令。',
    infoSection: 'canvas-commands',
    children: {
      zoomToClonedNode: {
        label: '克隆后跳转到节点',
        description: '启用后，克隆节点后画布会自动缩放到新节点。',
        type: 'boolean'
      },
      cloneNodeMargin: {
        label: '克隆节点间距',
        description: '克隆节点与原节点之间的间距。',
        type: 'number',
        parse: (value: string) => Math.max(0, parseInt(value) || 0)
      },
      expandNodeStepSize: {
        label: '扩展节点步长',
        description: '每次扩展节点的步长。',
        type: 'number',
        parse: (value: string) => Math.max(1, parseInt(value) || 0)
      }
    }
  },
  canvasMetadataCompatibilityEnabled: {
    label: '启用 .canvas 元数据缓存兼容',
    description: '使 .canvas 文件支持反向链接和出链功能，并在图谱视图中显示连接关系。',
    infoSection: 'full-metadata-cache-support',
    children: {
      enableSingleNodeLinks: {
        label: '启用 [[wikilink]] 引用节点',
        description: '启用后，可以用 [[canvas-file#node-id]] 引用和嵌入单个节点（使用「复制节点 wikilink」命令获取 ID）。',
        type: 'boolean'
      },
      enableSingleNodePopupReferenceCopy: {
        label: '显示复制 [[wikilink]] 按钮',
        description: '启用后，节点弹出菜单会显示一个按钮，方便复制节点的 [[wikilink]]。',
        type: 'boolean'
      }
    }
  },
  nativeFileSearchEnabled: {
    label: '类原生文件搜索',
    description: '启用后，使用 Obsidian 原生文件搜索来搜索画布内容。',
    infoSection: 'native-like-file-search',
    children: { }
  },
  autoFileNodeEdgesFeatureEnabled: {
    label: '自动文件节点连边',
    description: '根据文件节点的 frontmatter 链接自动创建边。',
    infoSection: 'auto-file-node-edges',
    children: {
      autoFileNodeEdgesFrontmatterKey: {
        label: 'Frontmatter 键名',
        description: '用于获取出链的 frontmatter 键名。（保持默认值以获得最佳兼容性。）',
        type: 'text',
        parse: (value: string) => value.trim() || 'canvas-edges'
      }
    }
  },
  portalsFeatureEnabled: {
    label: '门户',
    description: '在当前画布中嵌入其他画布。',
    infoSection: 'portals',
    children: {
      showEdgesIntoDisabledPortals: {
        label: '显示连入已禁用门户的边',
        description: '启用后，连入已禁用门户的边将显示出来。',
        type: 'boolean'
      }
    }
  },
  collapsibleGroupsFeatureEnabled: {
    label: '可折叠分组',
    description: '分组节点可以展开和折叠，保持画布整洁。',
    infoSection: 'collapsible-groups',
    children: {
      collapsedGroupPreviewOnDrag: {
        label: '拖拽时显示折叠分组预览',
        description: '启用后，拖拽节点时折叠分组会显示其边界。',
        type: 'boolean'
      }
    }
  },
  combineCustomStylesInDropdown: {
    label: '合并自定义样式',
    description: '将所有自定义样式属性合并到一个下拉菜单中。',
    children: { }
  },
  nodeStylingFeatureEnabled: {
    label: '节点样式',
    description: '用不同的形状和边框样式装饰节点。',
    infoSection: 'node-styles',
    children: {
      customNodeStyleAttributes: {
        label: '自定义节点样式设置',
        description: '为节点添加自定义样式设置。（前往 GitHub 了解更多信息）',
        type: 'button',
        onClick: () => {
          // eslint-disable-next-line obsidianmd/prefer-create-el -- Temp virtual anchor
          const anchor = activeDocument.createElement('a')
          anchor.href = "https://github.com/Developer-Mike/obsidian-canvas-enhance/blob/main/README.md#custom-styles"
          anchor.target = '_blank'
          anchor.click()
        },
      } as ButtonSetting,
      defaultTextNodeColor: {
        label: '默认文本节点颜色',
        description: '文本节点的默认颜色。范围 0-6，0 表示无颜色。可通过自定义颜色功能扩展范围。',
        type: 'number',
        parse: (value: string) => Math.max(0, parseInt(value) || 0)
      },
      defaultTextNodeStyleAttributes: {
        label: '默认文本节点样式属性',
        type: 'styles',
        getParameters(settingsManager) {
          return [
            ...BUILTIN_NODE_STYLE_ATTRIBUTES, /* BUILTINS */
            ...settingsManager.nodeCssStylesManager.getStyles(), /* CUSTOM CSS STYLES */
            ...settingsManager.getSetting('customNodeStyleAttributes') /* LEGACY CUSTOM STYLES */
          ].filter((setting) => setting.nodeTypes === undefined || setting.nodeTypes?.includes('text'))
        }
      } as StyleAttributesSetting
    }
  },
  edgesStylingFeatureEnabled: {
    label: '边样式',
    description: '用不同的路径样式装饰边。',
    infoSection: 'edge-styles',
    children: {
      customEdgeStyleAttributes: {
        label: '自定义边样式设置',
        description: '为边添加自定义样式设置。（前往 GitHub 了解更多信息）',
        type: 'button',
        onClick: () => {
          // eslint-disable-next-line obsidianmd/prefer-create-el -- Temp virtual anchor
          const anchor = activeDocument.createElement('a')
          anchor.href = "https://github.com/Developer-Mike/obsidian-canvas-enhance/blob/main/README.md#custom-styles"
          anchor.target = '_blank'
          anchor.click()
        },
      } as ButtonSetting,
      inheritEdgeColorFromNode: {
        label: '从节点继承边颜色',
        description: '从节点拖出创建新边时，边将继承该节点的颜色。',
        type: 'boolean'
      },
      defaultEdgeColor: {
        label: '默认边颜色',
        description: '边的默认颜色。范围 0-6，0 表示无颜色。可通过自定义颜色功能扩展范围。',
        type: 'number',
        parse: (value: string) => Math.max(0, parseInt(value) || 0)
      },
      defaultEdgeLineDirection: {
        label: '默认边方向',
        description: '边的默认方向。',
        type: 'dropdown',
        options: {
          'nondirectional': '无方向',
          'unidirectional': '单向',
          'bidirectional': '双向'
        }
      } as DropdownSetting,
      defaultEdgeStyleAttributes: {
        label: '默认边样式属性',
        type: 'styles',
        getParameters(settingsManager) {
          return [
            ...BUILTIN_EDGE_STYLE_ATTRIBUTES, /* BUILTINS */
            ...settingsManager.edgeCssStylesManager.getStyles(), /* CUSTOM CSS STYLES */
            ...settingsManager.getSetting('customEdgeStyleAttributes') /* LEGACY CUSTOM STYLES */
          ]
        }
      } as StyleAttributesSetting,
      edgeStyleUpdateWhileDragging: {
        label: '拖拽时更新边样式（可能很慢）',
        description: '启用后，拖拽边时会实时更新边样式。',
        type: 'boolean'
      },
      edgeStyleSquarePathRounded: {
        label: '方角路径圆角化',
        description: '启用后，方角路径的边角将变为圆角。',
        type: 'boolean'
      },
      edgeStylePathfinderAllowDiagonal: {
        label: 'A* 允许对角线路径',
        description: '启用后，A* 寻路将允许对角线路径。',
        type: 'boolean'
      },
      edgeStylePathfinderPathRounded: {
        label: 'A* 路径圆角化',
        description: '启用后，A* 路径将变为圆角。',
        type: 'boolean'
      }
    }
  },
  floatingEdgeFeatureEnabled: {
    label: '浮动边（自动选择连接侧）',
    description: '浮动边会自动放置在节点最合适的一侧。',
    infoSection: 'floating-edges-automatic-edge-side',
    children: {
      allowFloatingEdgeCreation: {
        label: '允许创建浮动边',
        description: '允许通过拖拽边到目标节点来创建浮动边，无需指定连接侧。（禁用后，浮动边只能通过其他 Canvas Enhance 功能创建和使用。）',
        type: 'boolean'
      },
      newEdgeFromSideFloating: {
        label: '新边起点自动浮动',
        description: '启用后，新边的「起点」侧将始终为浮动模式。',
        type: 'boolean'
      }
    }
  },
  flipEdgeFeatureEnabled: {
    label: '翻转边',
    description: '通过弹出菜单翻转边的方向。',
    infoSection: 'flip-edge',
    children: { }
  },
  presentationFeatureEnabled: {
    label: '演示模式',
    description: '从画布创建演示文稿。',
    infoSection: 'presentation-mode',
    children: {
      showSetStartNodeInPopup: {
        label: '在弹出菜单中显示「设为起始节点」',
        description: '关闭后，仍可通过对应命令设置起始节点。',
        type: 'boolean'
      },
      defaultSlideDimensions: {
        label: '默认幻灯片尺寸',
        description: '幻灯片的默认尺寸。',
        type: 'dimension',
        parse: (value: [string, string]) => {
          const width = Math.max(1, parseInt(value[0]) || 0)
          const height = Math.max(1, parseInt(value[1]) || 0)
          return [width, height]
        }
      },
      wrapInSlidePadding: {
        label: '包裹幻灯片内边距',
        description: '将选中内容包裹为幻灯片时的内边距。',
        type: 'number',
        parse: (value: string) => Math.max(0, parseInt(value) || 0)
      },
      resetViewportOnPresentationEnd: {
        label: '演示结束后重置视口',
        description: '启用后，演示结束后视口将恢复到原始位置。',
        type: 'boolean'
      },
      useArrowKeysToChangeSlides: {
        label: '用方向键切换幻灯片',
        description: '启用后，在演示模式中可以用方向键切换幻灯片。',
        type: 'boolean'
      },
      usePgUpPgDownKeysToChangeSlides: {
        label: '用 PgUp/PgDown 键切换幻灯片',
        description: '启用后，在演示模式中可以用 PgUp/PgDown 键切换幻灯片（兼容大多数演示遥控器）。',
        type: 'boolean'
      },
      zoomToSlideWithoutPadding: {
        label: '无内边距缩放到幻灯片',
        description: '启用后，缩放到幻灯片时不添加内边距。',
        type: 'boolean'
      },
      useUnclampedZoomWhilePresenting: {
        label: '演示时使用无限制缩放',
        description: '启用后，演示时缩放将不受限制。',
        type: 'boolean'
      },
      fullscreenPresentationEnabled: {
        label: '演示时进入全屏',
        description: '启用后，演示会自动请求全屏。禁用以保持 Obsidian 窗口模式。',
        type: 'boolean'
      },
      slideTransitionAnimationDuration: {
        label: '幻灯片切换动画时长',
        description: '幻灯片切换动画的时长（秒），设为 0 禁用动画。',
        type: 'number',
        parse: (value: string) => Math.max(0, parseFloat(value) || 0)
      },
      slideTransitionAnimationIntensity: {
        label: '幻灯片切换动画强度',
        description: '切换动画的强度。值越大，切换前缩远的幅度越大。',
        type: 'number',
        parse: (value: string) => Math.max(0, parseFloat(value) || 0)
      }
    }
  },
  zOrderingControlFeatureEnabled: {
    label: 'Z 轴层级控制',
    description: '通过右键菜单改变节点的持久化 z-index。',
    children: {
      zOrderingControlShowOneLayerShiftOptions: {
        label: '显示单层移动选项',
        description: '启用后，可以将节点向前或向后移动一层。',
        type: 'boolean'
      }
    }
  },
  aspectRatioControlFeatureEnabled: {
    label: '宽高比控制',
    description: '通过右键菜单改变节点的宽高比。',
    children: { }
  },
  variableBreakpointFeatureEnabled: {
    label: '变量断点',
    description: `通过 ${VARIABLE_BREAKPOINT_CSS_VAR} CSS 变量按节点设置缩放断点（即节点内容停止渲染的缩放级别）。`,
    infoSection: 'variable-breakpoints',
    children: { }
  },
  readingModeFixEnabled: {
    label: '替代文本渲染',
    description: '尝试同步编辑和阅读视图的渲染。注意：与 Obsidian 默认阅读视图相比会有视觉差异。',
    infoSection: 'alternative-text-rendering',
    children: { }
  },
  autoResizeNodeFeatureEnabled: {
    label: '自动调整节点大小',
    description: '根据内容自动调整节点高度。',
    infoSection: 'auto-node-resizing',
    children: {
      autoResizeNodeEnabledByDefault: {
        label: '默认启用自动调整',
        description: '启用后，所有节点默认开启自动调整高度功能。',
        type: 'boolean'
      },
      autoResizeNodeMaxHeight: {
        label: '最大高度',
        description: '自动调整时的最大高度（-1 表示不限制）。',
        type: 'number',
        parse: (value: string) => Math.max(-1, parseInt(value) ?? -1)
      },
      autoResizeNodeSnapToGrid: {
        label: '对齐网格',
        description: '启用后，节点高度将对齐到网格。',
        type: 'boolean'
      }
    }
  },
  canvasEncapsulationEnabled: {
    label: '画布封装',
    description: '通过右键菜单将选中的节点和边封装到新画布中。',
    infoSection: 'encapsulate-selection',
    children: { }
  },
  betterReadonlyEnabled: {
    label: '增强只读模式',
    description: '改进只读模式的体验。',
    infoSection: 'better-readonly',
    children: {
      hideBackgroundGridWhenInReadonly: {
        label: '只读模式隐藏背景网格',
        description: '启用后，只读模式下将隐藏背景网格。',
        type: 'boolean'
      },
    }
  },
  edgeHighlightEnabled: {
    label: '边高亮',
    description: '选中节点时高亮其出边（可选包含入边）。',
    infoSection: 'edge-highlight',
    children: {
      highlightIncomingEdges: {
        label: '高亮入边',
        description: '启用后，入边也会被高亮。',
        type: 'boolean'
      }
    }
  },
  edgeSelectionEnabled: {
    label: '边选择',
    description: '通过弹出菜单选择与选中节点相连的边。',
    infoSection: 'edge-selection',
    children: {
      selectEdgeByDirection: {
        label: '按方向选择边',
        description: '用单独的菜单项分别选择入边或出边。',
        type: 'boolean'
      }
    }
  },
  focusModeFeatureEnabled: {
    label: '专注模式',
    description: '聚焦单个节点，模糊其他节点。',
    infoSection: 'focus-mode',
    children: { }
  },
  mindmapFeatureEnabled: {
    label: '思维导图',
    description: '将画布变成思维导图：Tab 创建子节点，Enter 创建兄弟节点，Alt+方向键导航。',
    children: {
      mindmapChildNodeSpacing: {
        label: '子节点水平间距',
        description: '父子节点之间的水平间距。',
        type: 'number',
        parse: (value: string) => Math.max(0, parseInt(value) || 0)
      },
      mindmapSiblingNodeSpacing: {
        label: '兄弟节点垂直间距',
        description: '兄弟节点之间的垂直间距。',
        type: 'number',
        parse: (value: string) => Math.max(0, parseInt(value) || 0)
      },
      mindmapUseNavigationHotkeys: {
        label: '启用导航快捷键',
        description: '启用后，可以用 Alt+方向键在节点间导航。',
        type: 'boolean'
      },
      mindmapUseFloatingNodeHotkeys: {
        label: '启用浮动节点快捷键',
        description: '启用后，可以用 Cmd/Ctrl+方向键创建浮动节点。',
        type: 'boolean'
      },
      mindmapPropagateColorToEdges: {
        label: '颜色传播到边',
        description: '设置节点颜色时，自动传播到从该节点出发的边。',
        type: 'boolean'
      }
    }
  },
} as const satisfies {
  [key in keyof CanvasEnhancePluginSettingsValues | "general"]?: SettingsHeading & {
    children: {
      [key in keyof CanvasEnhancePluginSettingsValues]?: Setting
    }
  }
}

export default class SettingsManager {
  private plugin: CanvasEnhancePlugin
  private settings: CanvasEnhancePluginSettingsValues
  private settingsTab: CanvasEnhancePluginSettingTab

  nodeCssStylesManager: CssStylesConfigManager<StyleAttribute>
  edgeCssStylesManager: CssStylesConfigManager<StyleAttribute>

  constructor(plugin: CanvasEnhancePlugin) {
    this.plugin = plugin

    this.nodeCssStylesManager = GET_NODE_CSS_STYLES_MANAGER(plugin)
    this.edgeCssStylesManager = GET_EDGE_CSS_STYLES_MANAGER(plugin)
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS_VALUES, await this.plugin.loadData())
    this.plugin.app.workspace.trigger("canvas-enhance:settings-changed")
  }

  async saveSettings() {
    await this.plugin.saveData(this.settings)
  }

  getSetting<T extends keyof CanvasEnhancePluginSettingsValues>(key: T): CanvasEnhancePluginSettingsValues[T] {
    return this.settings[key]
  }

  async setSetting(data: Partial<CanvasEnhancePluginSettingsValues>) {
    this.settings = Object.assign(this.settings, data)
    await this.saveSettings()
    this.plugin.app.workspace.trigger("canvas-enhance:settings-changed")
  }

  addSettingsTab() {
    this.settingsTab = new CanvasEnhancePluginSettingTab(this.plugin, this)
    this.plugin.addSettingTab(this.settingsTab)
  }
}

export class CanvasEnhancePluginSettingTab extends PluginSettingTab {
  settingsManager: SettingsManager

  constructor(plugin: CanvasEnhancePlugin, settingsManager: SettingsManager) {
    super(plugin.app, plugin)
    this.settingsManager = settingsManager
  }

  display(): void {
    const { containerEl } = this
    containerEl.empty()
    containerEl.classList.add("ce-settings")

    this.createKofiBanner(containerEl)

    // Generate settings from SETTINGS object
    for (const [headingId, heading] of Object.entries(SETTINGS) as [string, SettingsHeading][]) {
      this.createFeatureHeading(
        containerEl,
        heading.label,
        heading.description,
        heading.infoSection,
        heading.disableToggle ? null : headingId as keyof CanvasEnhancePluginSettingsValues
      )

      const settingsHeaderChildrenContainerEl = containerEl.createDiv()
      settingsHeaderChildrenContainerEl.classList.add('settings-header-children')
      settingsHeaderChildrenContainerEl.createSpan() // Add empty span to not trigger the :first-child selector in the CSS

      for (const [settingId, setting] of Object.entries(heading.children) as [keyof CanvasEnhancePluginSettingsValues, Setting][]) {
        if (!(settingId in DEFAULT_SETTINGS_VALUES)) continue

        switch (setting.type) {
          case 'text':
            this.createTextSetting(settingsHeaderChildrenContainerEl, settingId, setting as TextSetting)
            break
          case 'number':
            this.createNumberSetting(settingsHeaderChildrenContainerEl, settingId, setting as NumberSetting)
            break
          case 'dimension':
            this.createDimensionSetting(settingsHeaderChildrenContainerEl, settingId, setting as DimensionSetting)
            break
          case 'boolean':
            this.createBooleanSetting(settingsHeaderChildrenContainerEl, settingId, setting as BooleanSetting)
            break
          case 'dropdown':
            this.createDropdownSetting(settingsHeaderChildrenContainerEl, settingId, setting as DropdownSetting)
            break
          case 'button':
            this.createButtonSetting(settingsHeaderChildrenContainerEl, settingId, setting as ButtonSetting)
            break
          case 'styles':
            this.createStylesSetting(settingsHeaderChildrenContainerEl, settingId, setting as StyleAttributesSetting)
            break
        }
      }
    }
  }

  private createFeatureHeading(containerEl: HTMLElement, label: string, description: string, infoSection: string | undefined, settingsKey: keyof CanvasEnhancePluginSettingsValues | null): SettingEl {
    const setting = new SettingEl(containerEl)
      .setHeading()
      .setClass('ce-settings-heading')
      .setName(label)
      .setDesc(description)

    if (infoSection !== undefined) {
      setting.addExtraButton(button => button
        .setTooltip("Open GitHub documentation")
        .setIcon('info')
        .onClick(async () => {
          // eslint-disable-next-line obsidianmd/prefer-create-el -- Temp virtual anchor
          const anchor = activeDocument.createElement('a')
          anchor.href = `${README_URL}#${infoSection}`
          anchor.target = '_blank'
          anchor.click()
        })
      )
    }

    if (settingsKey !== null) {
      setting.addToggle((toggle) =>
        toggle
          .setTooltip("Requires a reload to take effect.")
          .setValue(this.settingsManager.getSetting(settingsKey) as boolean)
          .onChange(async (value) => {
            await this.settingsManager.setSetting({ [settingsKey]: value })
            new Notice("重新加载 Obsidian 以应用更改。")
          })
      )
    }

    return setting
  }

  private createTextSetting(containerEl: HTMLElement, settingId: keyof CanvasEnhancePluginSettingsValues, setting: TextSetting) {
    new SettingEl(containerEl)
      .setName(setting.label)
      .setDesc(setting.description)
      .addText(text => text
        .setValue(this.settingsManager.getSetting(settingId) as string)
        .onChange(async (value) => {
          await this.settingsManager.setSetting({ [settingId]: setting.parse ? setting.parse(value) : value })
        })
      )
  }

  private createNumberSetting(containerEl: HTMLElement, settingId: keyof CanvasEnhancePluginSettingsValues, setting: NumberSetting) {
    new SettingEl(containerEl)
      .setName(setting.label)
      .setDesc(setting.description)
      .addText(text => text
        .setValue(JSON.stringify(this.settingsManager.getSetting(settingId)))
        .onChange(async (value) => {
          await this.settingsManager.setSetting({ [settingId]: setting.parse(value) })
        })
      )
  }

  private createDimensionSetting(containerEl: HTMLElement, settingId: keyof CanvasEnhancePluginSettingsValues, setting: DimensionSetting) {
    let text1: TextComponent
    let text2: TextComponent

    new SettingEl(containerEl)
      .setName(setting.label)
      .setDesc(setting.description)
      .addText(text => {
        text1 = text.setValue((this.settingsManager.getSetting(settingId) as [number, number])[0].toString())
          .onChange(async (value) => await this.settingsManager.setSetting({ [settingId]: setting.parse([value, text2.getValue()]) }))
      })
      .addText(text => {
        text2 = text.setValue((this.settingsManager.getSetting(settingId) as [number, number])[1].toString())
          .onChange(async (value) => await this.settingsManager.setSetting({ [settingId]: setting.parse([text1.getValue(), value]) }))
      })
  }

  private createBooleanSetting(containerEl: HTMLElement, settingId: keyof CanvasEnhancePluginSettingsValues, setting: BooleanSetting) {
    new SettingEl(containerEl)
      .setName(setting.label)
      .setDesc(setting.description)
      .addToggle(toggle => toggle
        .setValue(this.settingsManager.getSetting(settingId) as boolean)
        .onChange(async (value) => {
          await this.settingsManager.setSetting({ [settingId]: value })
        })
      )
  }

  private createDropdownSetting(containerEl: HTMLElement, settingId: keyof CanvasEnhancePluginSettingsValues, setting: DropdownSetting) {
    new SettingEl(containerEl)
      .setName(setting.label)
      .setDesc(setting.description)
      .addDropdown(dropdown => dropdown
        .addOptions(setting.options)
        .setValue(this.settingsManager.getSetting(settingId) as string)
        .onChange(async (value) => {
          await this.settingsManager.setSetting({ [settingId]: value })
        })
      )
  }

  private createButtonSetting(containerEl: HTMLElement, settingId: keyof CanvasEnhancePluginSettingsValues, setting: ButtonSetting) {
    new SettingEl(containerEl)
      .setName(setting.label)
      .setDesc(setting.description)
      .addButton(button => button
        .setButtonText('Open')
        .onClick(() => setting.onClick())
      )
  }

  private createStylesSetting(containerEl: HTMLElement, settingId: keyof CanvasEnhancePluginSettingsValues, setting: StyleAttributesSetting) {
    const nestedContainerEl = containerEl.createEl('details')
    nestedContainerEl.classList.add('setting-item')

    const summaryEl = nestedContainerEl.createEl('summary')
    summaryEl.textContent = setting.label

    for (const styleAttribute of setting.getParameters(this.settingsManager)) {
      new SettingEl(nestedContainerEl)
        .setName(styleAttribute.label)
        .addDropdown(dropdown => dropdown
          .addOptions(Object.fromEntries(styleAttribute.options.map(option => [option.value, option.value === null ? `${option.label} (default)` : option.label])))
          .setValue((this.settingsManager.getSetting(settingId) as { [key: string]: string })[styleAttribute.key] ?? 'null')
          .onChange(async (value) => {
            const newValue = this.settingsManager.getSetting(settingId) as { [key: string]: string }

            if (value === 'null') delete newValue[styleAttribute.key]
            else newValue[styleAttribute.key] = value

            await this.settingsManager.setSetting({
              [settingId]: newValue
            })
          })
        )
    }
  }

  private createKofiBanner(containerEl: HTMLElement) {
    const banner = containerEl.createDiv()
    banner.classList.add('kofi-banner')

    const title = banner.createSpan()
    title.classList.add('ce-kofi-banner-title')
    title.textContent = 'Support the development of Canvas Enhance'

    const koFiButton = banner.createEl('a')
    koFiButton.classList.add('ce-kofi-button')
    koFiButton.href = KOFI_PAGE_URL
    koFiButton.target = '_blank'

    const koFiImage = koFiButton.createEl('img')
    koFiImage.src = KOFI_BADGE_URI
  }
}
