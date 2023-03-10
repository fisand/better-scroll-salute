/*
 * Based on the work of: BetterScroll
 * https://github.com/ustbhuangyi/better-scroll
 *
 * Copyright (c) 2015 HuangYi
 * Licensed under the MIT License.
 * https://github.com/ustbhuangyi/better-scroll/blob/dev/LICENSE
 *
 */
import ScrollerOptions from './options'
import { Direction } from './utils'
import EventEmitter from './event'

export type Bounces = [boolean, boolean]

export type Rect = { size: string; position: string }

export interface Options {
  scrollable: boolean
  momentum: boolean
  momentumLimitTime: number
  momentumLimitDistance: number
  deceleration: number
  swipeBounceTime: number
  swipeTime: number
  bounces: Bounces
  rect: Rect
  [key: string]: number | boolean | Bounces | Rect
}

export default class Behavior {
  // content: HTMLElement
  currentPos: number
  startPos: number
  absStartPos: number
  dist: number
  minScrollPos: number
  maxScrollPos: number
  hasScroll: boolean
  direction: number
  movingDirection: number
  relativeOffset: number
  // wrapperStyle: CSSStyleDeclaration
  wrapperRect: any = { left: 0, right: 0, width: 0, height: 0 }
  contentRect: any = { left: 0, right: 0, width: 0, height: 0 }
  wrapperSize: number
  contentSize: number
  originWrapperSize: number
  originContentSize: number
  hooks: EventEmitter

  static createBehaviorOptions(
    scrollerOptions: ScrollerOptions,
    extraProp: 'scrollX' | 'scrollY',
    bounces: Bounces,
    rect: Rect
  ) {
    const options = [
      'momentum',
      'momentumLimitTime',
      'momentumLimitDistance',
      'deceleration',
      'swipeBounceTime',
      'swipeTime',
    ].reduce<Options>((prev, cur) => {
      prev[cur] = scrollerOptions[cur]
      return prev
    }, {} as Options)
    // add extra property
    options.scrollable = scrollerOptions[extraProp]
    options.bounces = bounces
    options.rect = rect
    return options
  }

  constructor(public options: Options) {
    this.hooks = new EventEmitter(['momentum', 'end'])
    // this.content = this.wrapper.children[0] as HTMLElement
    this.currentPos = 0
    this.startPos = 0
    // this.refresh = debounce(this.refresh, 50)
  }

  start() {
    this.direction = Direction.Default
    this.movingDirection = Direction.Default
    this.dist = 0
  }

  move(delta: number) {
    delta = this.hasScroll ? delta : 0
    // delta = this.options.scrollable ? delta : 0
    this.movingDirection = delta > 0 ? Direction.Negative : delta < 0 ? Direction.Positive : Direction.Default

    let newPos = this.currentPos + delta

    // Slow down or stop if outside of the boundaries
    if (newPos > this.minScrollPos || newPos < this.maxScrollPos) {
      if (
        (newPos > this.minScrollPos && this.options.bounces[0]) ||
        (newPos < this.maxScrollPos && this.options.bounces[1])
      ) {
        newPos = this.currentPos + delta / 3
      } else {
        newPos = newPos > this.minScrollPos ? this.minScrollPos : this.maxScrollPos
      }
    }

    return newPos
  }

  end(duration: number) {
    let momentumInfo: {
      destination?: number
      duration?: number
    } = {
      duration: 0,
    }

    const absDist = Math.abs(this.currentPos - this.startPos)
    // start momentum animation if needed
    if (
      this.options.momentum &&
      duration < this.options.momentumLimitTime &&
      absDist > this.options.momentumLimitDistance
    ) {
      const wrapperSize =
        (this.direction === Direction.Negative && this.options.bounces[0]) ||
        (this.direction === Direction.Positive && this.options.bounces[1])
          ? this.wrapperSize
          : 0

      momentumInfo = this.hasScroll
        ? this.momentum(
            this.currentPos,
            this.startPos,
            duration,
            this.maxScrollPos,
            this.minScrollPos,
            wrapperSize,
            this.options
          )
        : { destination: this.currentPos, duration: 0 }
    } else {
      this.hooks.trigger(this.hooks.eventTypes.end, momentumInfo)
    }
    return momentumInfo
  }

  private momentum(
    current: number,
    start: number,
    time: number,
    lowerMargin: number,
    upperMargin: number,
    wrapperSize: number,
    options = this.options
  ) {
    const distance = current - start
    const speed = Math.abs(distance) / time

    const { deceleration, swipeBounceTime, swipeTime } = options

    const momentumData = {
      destination: current + (speed / deceleration) * (distance < 0 ? -1 : 1),
      duration: swipeTime,
      rate: 15,
    }

    this.hooks.trigger(this.hooks.eventTypes.momentum, momentumData, distance)

    if (momentumData.destination < lowerMargin) {
      momentumData.destination = wrapperSize
        ? Math.max(lowerMargin - wrapperSize / 4, lowerMargin - (wrapperSize / momentumData.rate) * speed)
        : lowerMargin
      momentumData.duration = swipeBounceTime
    } else if (momentumData.destination > upperMargin) {
      momentumData.destination = wrapperSize
        ? Math.min(upperMargin + wrapperSize / 4, upperMargin + (wrapperSize / momentumData.rate) * speed)
        : upperMargin
      momentumData.duration = swipeBounceTime
    }
    momentumData.destination = Math.round(momentumData.destination)

    return momentumData
  }

  updateDirection() {
    const absDist = Math.round(this.currentPos) - this.absStartPos
    this.direction = absDist > 0 ? Direction.Negative : absDist < 0 ? Direction.Positive : Direction.Default
  }

  setDimensions(wrapperRect: DOMRect, contentRect: DOMRect) {
    this.wrapperRect = wrapperRect
    this.contentRect = contentRect
    this.refresh()
  }

  refresh() {
    const { size, position } = this.options.rect
    // const isWrapperStatic = this.wrapperStyle && this.wrapperStyle.position === 'static'

    this.wrapperSize = this.originWrapperSize = this.wrapperRect[size]
    this.contentSize = this.originContentSize = this.contentRect[size]
    this.relativeOffset = this.contentRect[position]

    // if (isWrapperStatic) {
    // this.relativeOffset -= this.wrapperRect[position]
    // }
    this.relativeOffset -= this.wrapperRect[position]

    this.minScrollPos = 0
    this.maxScrollPos = this.wrapperSize - this.contentSize

    // if (this.maxScrollPos < 0) {
    //   this.maxScrollPos -= this.relativeOffset
    //   this.minScrollPos = -this.relativeOffset
    // }

    this.hasScroll = this.options.scrollable && this.maxScrollPos <= this.minScrollPos

    if (!this.hasScroll) {
      this.maxScrollPos = this.minScrollPos
      this.contentSize = this.wrapperSize
    }

    this.direction = 0
  }

  updatePosition(pos: number) {
    this.currentPos = pos
  }

  getCurrentPos() {
    return Math.round(this.currentPos)
  }

  checkInBoundary() {
    const position = Math.round(this.adjustPosition(this.currentPos))
    const inBoundary = position === this.getCurrentPos()
    return {
      position,
      inBoundary,
    }
  }

  // adjust position when out of boundary
  adjustPosition(pos: number) {
    let roundPos = Math.round(pos)
    if (!this.hasScroll || roundPos > this.minScrollPos) {
      roundPos = this.minScrollPos
    } else if (roundPos < this.maxScrollPos) {
      roundPos = this.maxScrollPos
    }
    return roundPos
  }

  updateStartPos() {
    this.startPos = this.currentPos
  }

  updateAbsStartPos() {
    this.absStartPos = this.currentPos
  }

  resetStartPos() {
    this.updateStartPos()
    this.updateAbsStartPos()
  }

  getAbsDist(delta: number) {
    this.dist += delta
    return Math.abs(this.dist)
  }

  destroy() {
    this.hooks.destroy()
  }
}
