declare var Page: any
declare var Component: any

export const noop = () => {}

export const no = () => false

export const warn = (msg: string, fn = 'error') => {
  !isProd && console[fn](`[better-scroll-salute]: ${msg}`)
}

export const objectToString = Object.prototype.toString

export const toTypeString = (value: unknown): string => objectToString.call(value)

export const isPlainObject = (val: unknown): val is object => toTypeString(val) === '[object Object]'

// Development environment
export const isProd = process.env.NODE_ENV === 'production'

// isinminiprograme
export const ismp = typeof Page === 'function' && typeof Component === 'function'

// Browser environment sniffing
export const root: any = (typeof window !== 'undefined' ? window : globalThis) || {}

// browser, miniapp, server
export const inBrowser = typeof window !== 'undefined' && !!(root as any).history
export const UA = inBrowser && (root as any).navigator && (root as any).navigator.userAgent.toLowerCase()
export const isAndroid = inBrowser && UA && UA.indexOf('android') > 0
export const isIOS = inBrowser && UA && /iphone|ipad|ipod|ios/.test(UA)
export const isWeChatDevTools = UA && /wechatdevtools/.test(UA)

export const extend = Object.assign

export class MDDocument {
  nodeName: string = ''

  constructor(name: string) {
    this.nodeName = name || ''
  }
  appendChild() {}
  removeChild() {}
  querySelector() {}
  addEventListener() {}
  removeEventListener() {}
  createElement() {}
  createEvent() {}
}

export let mdDocument

if (inBrowser) {
  mdDocument = (root as any).document
} else {
  mdDocument = new MDDocument('#document')
  mdDocument.body = new MDDocument('BODY')
  mdDocument.documentElement = new MDDocument('HTML')
  ;(root as any).addEventListener = () => {}
  ;(root as any).removeEventListener = () => {}
}

export const enum Probe {
  Default,
  Throttle,
  Normal,
  Realtime,
}

export const enum EventType {
  Touch = 1,
  Mouse = 2,
}

export const enum MouseButton {
  Left,
  Middle,
  Right,
}

export const enum EventPassthrough {
  None = '',
  Horizontal = 'horizontal',
  Vertical = 'vertical',
}

export const enum Direction {
  Positive = 1, // bottom to top and right to left
  Negative = -1, // top to bottom and left to right
  Default = 0,
}

export const enum DirectionLock {
  Default = '',
  Horizontal = 'horizontal',
  Vertical = 'vertical',
  None = 'none',
}

export const eventTypeMap: {
  [key: string]: number
  touchstart: number
  touchmove: number
  touchend: number
  mousedown: number
  mousemove: number
  mouseup: number
} = {
  touchstart: 1,
  touchmove: 1,
  touchend: 1,

  mousedown: 2,
  mousemove: 2,
  mouseup: 2,
  mouseleave: 2,
}

export interface MountedBScrollHTMLElement extends HTMLElement {
  isBScrollContainer?: boolean
}

export function getElement(el: HTMLElement | string) {
  return (typeof el === 'string' ? mdDocument.querySelector(el) : el) as HTMLElement
}

export type safeCSSStyleDeclaration = {
  [key: string]: string
} & CSSStyleDeclaration

let elementStyle = (inBrowser && mdDocument.createElement('div').style) as safeCSSStyleDeclaration

let vendor = (() => {
  if (!inBrowser) {
    return false
  }
  let transformNames: {
    [prefix: string]: string
  } = {
    webkit: 'webkitTransform',
    Moz: 'MozTransform',
    O: 'OTransform',
    ms: 'msTransform',
    standard: 'transform',
  }

  for (let key in transformNames) {
    if (elementStyle[transformNames[key]] !== undefined) {
      return key
    }
  }

  return false
})()

function prefixStyle(style: string): string {
  if (vendor === false) {
    return style
  }

  if (vendor === 'standard') {
    if (style === 'transitionEnd') {
      return 'transitionend'
    }
    return style
  }

  return vendor + style.charAt(0).toUpperCase() + style.substr(1)
}

let transform = prefixStyle('transform')
let transition = prefixStyle('transition')

export const hasPerspective = inBrowser && prefixStyle('perspective') in elementStyle
// fix issue #361
export const hasTouch = inBrowser && ('ontouchstart' in root || isWeChatDevTools)
export const hasTransition = inBrowser && transition in elementStyle

export const style = {
  transform,
  transition,
  transitionTimingFunction: prefixStyle('transitionTimingFunction'),
  transitionDuration: prefixStyle('transitionDuration'),
  transitionDelay: prefixStyle('transitionDelay'),
  transformOrigin: prefixStyle('transformOrigin'),
  transitionEnd: prefixStyle('transitionEnd'),
}

export function getRect(el: HTMLElement): Partial<DOMRect> {
  if (el instanceof (window as any).SVGElement) {
    let rect = el.getBoundingClientRect()
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    }
  } else {
    return {
      top: el.offsetTop,
      left: el.offsetLeft,
      width: el.offsetWidth,
      height: el.offsetHeight,
    }
  }
}

interface TouchList {
  length: number
  [index: number]: Touch
  item: (index: number) => Touch
}

interface Touch {
  identifier: number
  target: EventTarget
  screenX: number
  screenY: number
  clientX: number
  clientY: number
  pageX: number
  pageY: number
}

export interface TouchEvent extends UIEvent {
  touches: TouchList
  targetTouches: TouchList
  changedTouches: TouchList
  altKey: boolean
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  rotation: number
  scale: number
  button: number
  _constructed?: boolean
}

export function preventDefaultExceptionFn(
  el: any,
  exceptions: {
    tagName?: RegExp
    className?: RegExp
    [key: string]: any
  }
) {
  for (let i in exceptions) {
    if (exceptions[i].test(el[i])) {
      return true
    }
  }
  return false
}

export const tagExceptionFn = preventDefaultExceptionFn

export function isUndef(v: any): boolean {
  return v === undefined || v === null
}

export function tap(e: any, eventName: string) {
  let ev = mdDocument.createEvent('Event') as any
  if (!ev) {
    return
  }
  ev.initEvent(eventName, true, true)
  ev.pageX = e.pageX
  ev.pageY = e.pageY
  e.target.dispatchEvent(ev)
}

export function click(e: any, event = 'click') {
  let eventSource
  if (e.type === 'mouseup') {
    eventSource = e
  } else if (e.type === 'touchend' || e.type === 'touchcancel') {
    eventSource = e.changedTouches[0]
  }
  let posSrc: {
    screenX?: number
    screenY?: number
    clientX?: number
    clientY?: number
  } = {}
  if (eventSource) {
    posSrc.screenX = eventSource.screenX || 0
    posSrc.screenY = eventSource.screenY || 0
    posSrc.clientX = eventSource.clientX || 0
    posSrc.clientY = eventSource.clientY || 0
  }
  let ev: any
  const bubbles = true
  const cancelable = true
  if (typeof MouseEvent !== 'undefined') {
    try {
      ev = new MouseEvent(
        event,
        extend(
          {
            bubbles,
            cancelable,
          },
          posSrc
        )
      )
    } catch (e) {
      createEvent()
    }
  } else {
    createEvent()
  }

  function createEvent() {
    ev = mdDocument.createEvent('Event')
    if (!ev) {
      return
    }
    ev.initEvent(event, bubbles, cancelable)
    extend(ev, posSrc)
  }

  // forwardedTouchEvent set to true in case of the conflict with fastclick
  ev.forwardedTouchEvent = true
  ev._constructed = true
  e.target.dispatchEvent(ev)
}

export function dblclick(e: Event) {
  click(e, 'dblclick')
}

/**
 * Multiple Array traversal
 * @return traverse.CONTINUE | traverse.BREAK
 */
export function traverse(data, childrenKeys = [], fn: any) {
  if (!data) {
    return
  }
  if (typeof childrenKeys === 'function') {
    fn = childrenKeys
    childrenKeys = []
  }
  let level = 0 // current level
  let indexs = [] // index set of all levels
  const walk = (curData) => {
    for (let i = 0, len = curData.length; i < len; i++) {
      const isArray = Array.isArray(curData[i])
      const key = Array.isArray(childrenKeys) ? childrenKeys[level] : childrenKeys
      if (isArray || (curData[i] && curData[i][key])) {
        level++
        indexs.push(i)
        walk(isArray ? curData[i] : curData[i][key])
      } else if (level >= childrenKeys.length) {
        const res = fn(curData[i], level, [...indexs, i]) as unknown
        if (res === traverse.CONTINUE) {
          continue
        } else if (res === traverse.BREAK) {
          break
        }
      } else {
        continue
      }
    }
    level = 0
    indexs = []
  }
  walk(data)
}
traverse.CONTINUE = 1
traverse.BREAK = 2

export function getNow() {
  return root.performance && root.performance.now && root.performance.timing
    ? root.performance.now() + root.performance.timing.navigationStart
    : +new Date()
}

export const requestAnimationFrame = (() => {
  // Check for request animation Frame support
  const requestFrame =
    root.requestAnimationFrame ||
    root.webkitRequestAnimationFrame ||
    root.mozRequestAnimationFrame ||
    root.oRequestAnimationFrame

  let isNative = !!requestFrame

  if (requestFrame && !/requestAnimationFrame\(\)\s*\{\s*\[native code\]\s*\}/i.test(requestFrame.toString())) {
    isNative = false
  }

  if (isNative) {
    return requestFrame
  }

  const TARGET_FPS = 60
  let requests = {}
  let requestCount = 0
  let rafHandle = 1
  let intervalHandle = null
  let lastActive = getNow()

  return (callback) => {
    const callbackHandle = rafHandle++

    // Store callback
    requests[callbackHandle] = callback
    requestCount++

    // Create timeout at first request
    if (intervalHandle === null) {
      intervalHandle = setInterval(() => {
        const time = getNow()
        const currentRequests = requests

        // Reset data structure before executing callbacks
        requests = {}
        requestCount = 0

        for (const key in currentRequests) {
          if (currentRequests.hasOwnProperty(key)) {
            currentRequests[key](time)
            lastActive = time
          }
        }

        // Disable the timeout when nothing happens for a certain
        // period of time
        if (time - lastActive > 2500) {
          clearInterval(intervalHandle)
          intervalHandle = null
        }
      }, 1000 / TARGET_FPS)
    }
    return callbackHandle
  }
})()

export const cancelAnimationFrame = (() => {
  if (!inBrowser) {
    /* istanbul ignore if */
    return noop
  }
  return (
    root.cancelAnimationFrame ||
    root.webkitCancelAnimationFrame ||
    root.mozCancelAnimationFrame ||
    root.oCancelAnimationFrame ||
    function (id: number) {
      root.clearTimeout(id)
    }
  )
})()
