/** Core Class */
class PlainGallery extends EventTarget {

    static MIN_SCALE = 2;
    static MAX_SCALE = 10;
    static Event = {
        OPEN: 'open',
        CHANGE: 'change',
        CLOSE: 'close',
    }

    current = null;
    dataSource = [];
    shadeMask = new ShadeMask(this);
    toolbar = new Toolbar(this);

    /** Initialization Component */
    constructor(gallery, children) {
        super();
        // Bind global window events
        window.addEventListener('resize', this.#adaptViewport.bind(this));
        window.addEventListener('keyup', this.#onEscPress.bind(this));

        // Delegate gallery events
        const { el } = this.shadeMask;
        el.addEventListener('click', this.#onShadeMaskClick.bind(this));
        el.addEventListener('wheel', this.#onZoomWrapWheel.bind(this));
        el.addEventListener('pointerdown', this.#onZoomWrapDrag.bind(this));

        // Traverse all thumbnail items
        let ordinal = -1; // Also refers to group index
        for (const group of document.querySelectorAll(gallery)) {
            const thumbnails = [];
            this.dataSource.push(thumbnails);
            ordinal++;

            let index = 0;
            for (const item of group.querySelectorAll(children)) {
                const thumbnail = item.querySelector('img');
                if (!thumbnail) continue;

                thumbnails.push(thumbnail);
                thumbnail.originalUrl = item.getAttribute('href');
                thumbnail.ordinal = ordinal;
                thumbnail.index = index++;
                thumbnail.addEventListener('click', e => {
                    e.preventDefault();
                    this.#openViewport(e.target);
                });
            }
        }
    }

    /** Open gallery viewport */
    #openViewport(source) {
        this.current = this.#createZoomWrap(source);
        this.shadeMask.fadeIn();
        this.#toggleSlideArrows();
        this.#adaptViewport(true);

        // Dispatch custom events
        this.fire(PlainGallery.Event.OPEN, this.current);
        this.fire(PlainGallery.Event.CHANGE, this.current);
    }

    /** Make the image adapt to viewport */
    #adaptViewport(delay) {
        if (!this.shadeMask.isOpened) return;
        const scrWidth = window.innerWidth;
        const scrHeight = window.innerHeight;
        const scrRatio = scrWidth / scrHeight;
        const { current } = this;

        // Calculate the adapted size and position
        current.scale = current.aspectRatio > scrRatio ? scrWidth / current.width : scrHeight / current.height;
        current.initScale = current.scale;
        current.minScale = current.scale / PlainGallery.MIN_SCALE;
        current.maxScale = current.scale * PlainGallery.MAX_SCALE;
        current.initX = current.transX = scrWidth / 2 - current.centerPoint.x;
        current.initY = current.transY = scrHeight / 2 - current.centerPoint.y;
        delay ? setTimeout(current.transform) : current.transform();
    }

    /** Click the mask to slide or close */
    #onShadeMaskClick(e) {
        const { target } = e;
        const { current, toolbar } = this;
        const { prevBtn, nextBtn } = this.shadeMask;
        console.log(target);

        if (current.contains(target) || toolbar.el.contains(target)) return;
        if (prevBtn.contains(target) || nextBtn.contains(target)) {
            this.slide(target.closest('svg').direction);
        } else {
            this.close();
        }
    }

    /** Scroll the mouse wheel to zoom */
    #onZoomWrapWheel(e) {
        e.preventDefault();
        const { current } = this;
        if (!current.contains(e.target)) return;

        current.scale = e.wheelDelta > 0 ? current.scale * 1.2 : current.scale / 1.2;
        if (current.scale > current.maxScale) current.scale = current.maxScale;
        if (current.scale < current.minScale) current.scale = current.minScale;
        current.transform();

        this.#checkBoundary();
    }

    /** Drag to preview the image */
    #onZoomWrapDrag() {
        const gallery = this;

        this.current.onpointerdown = function (e) {
            e.preventDefault();
            this.moved = false;
            this.startX = e.clientX;
            this.startY = e.clientY;
            this.css('transition:none; cursor:grab');

            this.onpointermove = function (e) {
                this.moved = true;
                this.offsetX = e.clientX - this.startX;
                this.offsetY = e.clientY - this.startY;
                this.style.cursor = 'grabbing';
                this.transform(this.transX + this.offsetX, this.transY + this.offsetY, null);
            }

            this.onpointerup = this.onpointerout = function (e) {
                this.transX += this.offsetX ?? 0;
                this.transY += this.offsetY ?? 0;
                this.onpointermove = null;
                this.style.transition = 'all .3s';

                // Click to zoom in/out
                if (e.type == 'pointerup' && !this.moved) {
                    this.transX = window.innerWidth - this.centerPoint.x - e.clientX;
                    this.transY = window.innerHeight - this.centerPoint.y - e.clientY;
                    this.scale = this.scale <= this.initScale ? this.scale *= 2 : this.initScale;
                    this.transform(null, null, this.scale);
                }

                gallery.#checkBoundary();
            }
        };
    }

    /** Press esc key to close */
    #onEscPress(e) {
        if (e.keyCode === 27) this.close();
    }

    /** Get thumbnail from data source */
    #getThumbnail(ordinal, index) {
        const thumbnails = this.dataSource[ordinal];
        const max = thumbnails.length - 1;
        return index < 0 || index > max ? null : thumbnails[index];
    }

    /** Toggle visibility of the slide arrows */
    #toggleSlideArrows() {
        const { prevBtn, nextBtn } = this.shadeMask;
        const { ordinal, index } = this.current;
        const max = this.dataSource[ordinal].length - 1;
        prevBtn.style.visibility = index == 0 ? 'hidden' : 'visible';
        nextBtn.style.visibility = index == max ? 'hidden' : 'visible';
    }

    /** Check zoom and drag boundaries */
    #checkBoundary() {
        const { current } = this;
        // Toggle zoom style of the cursor
        current.style.cursor = current.scale <= current.initScale ? 'zoom-in' : 'zoom-out';

        const width = current.width * current.scale;
        const height = current.height * current.scale;
        const bound = {
            x1: current.initX, x2: current.initX,
            y1: current.initY, y2: current.initY
        }
        if (width > innerWidth) {
            bound.x1 = width / 2 - current.centerPoint.x;
            bound.x2 = bound.x1 - (width - innerWidth);
        }
        if (height > innerHeight) {
            bound.y1 = height / 2 - current.centerPoint.y;
            bound.y2 = bound.y1 - (height - innerHeight);
        }
        if (current.transX > bound.x1) {
            current.transX = bound.x1;
            current.transform();
        }
        if (current.transX < bound.x2) {
            current.transX = bound.x2;
            current.transform();
        }
        if (current.transY > bound.y1) {
            current.transY = bound.y1;
            current.transform();
        }
        if (current.transY < bound.y2) {
            current.transY = bound.y2;
            current.transform();
        }
    }

    /** Create the zoom wrap for image */
    #createZoomWrap(source) {
        const { ordinal, index } = source;
        const rect = source.getBoundingClientRect();
        const placeholder = source.cloneNode(true);
        placeholder.className = 'plga-image-placeholder'

        const original = source.cloneNode(true);
        original.className = 'plga-image-placeholder'
        if (source.originalUrl) {
            original.src = source.originalUrl+'?'+Math.random();
        }

        const zoomWrap = createElement('<div class="plga-zoom-wrap"></div>');
        zoomWrap.width = rect.width;
        zoomWrap.height = rect.height;
        zoomWrap.ordinal = ordinal;
        zoomWrap.index = index;
        zoomWrap.css(`left:${rect.left}px; top:${rect.top}px; width:${rect.width}px; height:${rect.height}px`)
        zoomWrap.append(placeholder);
        zoomWrap.append(original);
        this.shadeMask.el.append(zoomWrap);

        zoomWrap.aspectRatio = rect.width / rect.height;
        zoomWrap.centerPoint = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        }
        zoomWrap.transform = (x, y, s) => {
            zoomWrap.style.setProperty('--transX', (x ?? zoomWrap.transX) + 'px');
            zoomWrap.style.setProperty('--transY', (y ?? zoomWrap.transY) + 'px');
            zoomWrap.style.setProperty('--scale', s ?? zoomWrap.scale);
        }
        zoomWrap.restore = () => {
            zoomWrap.transform(0, 0, 1);
            zoomWrap.ontransitionend = () => zoomWrap.remove();
        }
        return zoomWrap;
    }

    /** Open gallery with the specified index */
    open(ordinal, index) {
        const source = this.#getThumbnail(ordinal ?? 0, index ?? 0);
        this.#openViewport(source);
    }

    /** Slide gallery according to the direction */
    slide(direction) {
        // Slide the current image out
        // Stop sliding if thumbnail is null (first or last image)
        const { ordinal, index } = this.current;
        const thumbnail = this.#getThumbnail(ordinal, index + direction);
        if (!thumbnail) return;

        const slideImage = (direction, removeEl) => {
            const { current } = this;
            const scrWidth = window.innerWidth;
            direction > 0 ? current.transX -= scrWidth : current.transX += scrWidth;
            current.scale = current.initScale;
            current.transform();

            if (removeEl) {
                current.ontransitionend = () => current.remove();
            }
        }
        slideImage(direction, true);

        // Slide the next image in
        this.current = this.#createZoomWrap(thumbnail);
        this.#adaptViewport(false);
        slideImage(-direction, false); // Hide from the screen
        this.#toggleSlideArrows();

        setTimeout(() => {
            slideImage(direction, false);
            this.fire(PlainGallery.Event.CHANGE, this.current);
        });
    }

    /** Close gallery */
    close() {
        if (this.shadeMask.isOpened) {
            this.shadeMask.fadeOut();
            this.fire(PlainGallery.Event.CLOSE, this.current);
        }
    }

    /** Listening for custom event */
    on(type, callback) {
        this.addEventListener(type, e => callback(e.detail));
    }

    /** Dispatch custom event */
    fire(type, detail) {
        this.dispatchEvent(new CustomEvent(type, { detail }));
    }

}

/** Toolbar Component */
class Toolbar {

    gallery = null;
    el = createElement(`<div class="plga-toolbar">
        <div class="plga-toolbar-left"></div>
        <div class="plga-toolbar-right"></div>
    </div>`);

    constructor(gallery) {
        this.gallery = gallery;
        gallery.shadeMask.el.append(this.el);

        // Register default widget: counter
        this.register({
            html: '<div class="plga-counter"></div>',
            onInit: (el) => {
                gallery.on(PlainGallery.Event.CHANGE, (current) => {
                    const { ordinal, index } = gallery.current;
                    const total = gallery.dataSource[ordinal].length;
                    el.innerHTML = (index+1) + '/' + total;
                });
            }
        });

        // Register default widget: close button
        this.register({
            position: 'right',
            html: '<svg xmlns="http://www.w3.org/2000/svg" class="plga-icon" viewBox="0 0 32 32" width="32"><path d="M24 10l-2-2-6 6-6-6-2 2 6 6-6 6 2 2 6-6 6 6 2-2-6-6z"/></svg>',
            onInit: (el) => {
                el.onclick = () => gallery.close();
            }
        });
    }

    register(options) {
        const { position, html, onInit } = options;
        const widget = createElement(html);

        if (position == 'right') {
            const right = this.el.querySelector('.plga-toolbar-right');
            right.insertBefore(widget, right.firstChild);
        } else {
            const left = this.el.querySelector('.plga-toolbar-left');
            left.append(widget);
        }
        options.onInit(widget, this.gallery);
    }

}

/** Shade Mask Component */
class ShadeMask {

    gallery = null;
    isOpened = false;
    el = createElement(`<div class="plga-shade-mask">
        <svg class="plga-icon plga-icon-prev" viewBox="0 0 60 60" width="48"><path d="M29 43l-3 3-16-16 16-16 3 3-13 13 13 13z"/></svg>
        <svg class="plga-icon plga-icon-next" viewBox="0 0 60 60" width="48" transform="rotate(180)"><path d="M29 43l-3 3-16-16 16-16 3 3-13 13 13 13z"/></svg>
    </div>`);

    constructor(gallery) {
        this.gallery = gallery;
        this.embedStyles();

        this.prevBtn = this.el.querySelector('.plga-icon-prev');
        this.nextBtn = this.el.querySelector('.plga-icon-next');
        this.prevBtn.direction = -1;
        this.nextBtn.direction = 1;
        document.body.append(this.el);
    }

    fadeIn() {
        this.el.ontransitionend = null;
        this.el.style.display = 'flex';
        setTimeout(() => this.el.style.background = 'rgba(0, 0, 0, .8)');
        this.isOpened = true;
    }

    fadeOut() {
        this.el.style.background = 'rgba(0, 0, 0, 0)';
        this.el.ontransitionend = () => this.el.style.display = 'none';
        this.gallery.current.restore();
        this.isOpened = false;
    }

    embedStyles() {
        document.head.append(createElement(`<style>
            .plga-shade-mask {
                user-select: none;
                display: none;
                justify-content: space-between;
                align-items: center;
                position: fixed;
                z-index: 998;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0);
                color: #fff;
                transition: all .3s;
            }
            .plga-icon {
                z-index: 999;
                fill: currentcolor;
                cursor: pointer;
                opacity: .8;
                transition: all .3s;
                stroke: rgba(0,0,0,.3);
                stroke-width: .2;
            }
            .plga-icon:hover {
                opacity: 1;
            }
            .plga-icon-prev, .plga-icon-next {
                padding: 20px;
            }
            .plga-toolbar {
                position: absolute;
                z-index: 999;
                top: 0; left: 0; right:0;
                height: 60px;
                padding: 0 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                text-shadow: 1px 1px 5px rgba(0,0,0,.3);
            }
            .plga-toolbar>div {
                display: flex;
                align-items: center;
                gap: 15px;
            }
            .plga-zoom-wrap {
                position: absolute;
                cursor: zoom-in;
                transform: translate(var(--transX), var(--transY)) scale(var(--scale));
                transition: all .3s;
                will-change: transform;
            }
            .plga-image-placeholder {
                position: absolute;
                max-width: 100%;
                max-height: 100%;
            }
        </style>`.replace(/\s+/g, ' ')));
    }

}

Object.assign(Element.prototype, {
    css(text) {
        let cssText = this.style.cssText;
        const l = cssText.length - 1;
        if (l >= 0 && cssText.indexOf(';', l) == l) cssText += ';';
        this.style.cssText = cssText + text;
    }
});

function createElement(content) {
    if (!content) return;
    content = content.replace(/[\t\r\n]/mg, '').trim();

    if (content.indexOf('<') === 0) {
        const template = document.createElement('template');
        template.innerHTML = content;
        return template.content.firstElementChild;
    }
    return document.createElement(content);
}