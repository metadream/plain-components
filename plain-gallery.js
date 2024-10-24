/**
 * Plain Gallery
 * Lightweight and independent javascript image gallery component.
 *
 * @Copyright (c) 2024 Ai Chen
 * @Repository https://github.com/metadream/plain-gallery
 * @License MIT
 */
class PlainGallery extends EventTarget {

    // Constants
    static Zoom = { MIN_SCALE: 2, MAX_SCALE: 10, STEP: 1.2 };
    static Event = { OPEN: 'open', CHANGE: 'change', CLOSE: 'close', IMAGE_LOADED: 'imageLoaded'};

    // Utils
    static createElement(content) {
        if (!content) return;
        content = content.replace(/[\t\r\n]/mg, '').trim();

        if (content.indexOf('<') === 0) {
            const template = document.createElement('template');
            template.innerHTML = content;
            return template.content.firstElementChild;
        }
        return document.createElement(content);
    }

    // Properties
    current = null;
    isOpened = false;
    dataSource = [];
    shadeMask = new PlainGallery.ShadeMask(this);
    toolbar = new PlainGallery.Toolbar(this);

    // Viewport size minus scrollbars
    viewport = {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight
    }

    /** Overall initialization */
    constructor(groupSelector, itemSelector) {
        super();

        // Bind global window events
        window.addEventListener('resize', this.#onViewportResize.bind(this));
        window.addEventListener('keyup', this.#onEscPress.bind(this));

        // Delegate gallery events
        const { el } = this.shadeMask;
        el.addEventListener('click', this.#onShadeMaskClick.bind(this));
        el.addEventListener('wheel', this.#onPreviewZoneWheel.bind(this));
        el.addEventListener('pointerdown', this.#onPreviewZoneDrag.bind(this));

        // Traverse all items in groups
        let ordinal = -1; // Namely group index
        for (const group of document.querySelectorAll(groupSelector)) {
            const items = [];
            this.dataSource.push(items);
            ordinal++;

            let index = 0;
            for (const item of group.querySelectorAll(itemSelector)) {
                const thumbnail = item.querySelector('img');
                if (!thumbnail) continue;

                items.push({ thumbnail });
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

    /** Open gallery viewport based on thumbnail element */
    #openViewport(source) {
        this.current = this.#createPreviewZone(source);
        this.shadeMask.fadeIn();
        this.#toggleSlideArrows();
        this.#adaptViewport(true);
        this.isOpened = true;

        // Dispatch custom events
        this.fire(PlainGallery.Event.OPEN, this);
        this.fire(PlainGallery.Event.CHANGE, this);
    }

    /** Make the image adapt to viewport */
    #adaptViewport(delay) {
        const { current } = this;
        const { rect } = current;
        const { width, height } = this.viewport;
        const viewportRatio = width / height;

        // Calculate the adapted size and position
        current.scale = current.aspectRatio > viewportRatio ? width / rect.width : height / rect.height;
        current.initScale = current.scale;
        current.minScale = current.scale / PlainGallery.Zoom.MIN_SCALE;
        current.maxScale = current.scale * PlainGallery.Zoom.MAX_SCALE;
        current.initX = current.transX = width / 2 - current.centerPoint.x;
        current.initY = current.transY = height / 2 - current.centerPoint.y;
        delay ? setTimeout(current.transform) : current.transform();
    }

    /** Click the mask to slide or close */
    #onShadeMaskClick(e) {
        const { target } = e;
        const { current, toolbar } = this;
        const { prevBtn, nextBtn } = this.shadeMask;

        if (current.contains(target) || toolbar.el.contains(target)) return;
        if (prevBtn.contains(target) || nextBtn.contains(target)) {
            this.slide(target.closest('svg').direction);
        } else {
            this.close();
        }
    }

    /** Scroll the mouse wheel to zoom */
    #onPreviewZoneWheel(e) {
        e.preventDefault();
        const { current } = this;
        if (!current.contains(e.target)) return;

        if (e.wheelDelta > 0) current.scale *= PlainGallery.Zoom.STEP
        else current.scale /= PlainGallery.Zoom.STEP;
        if (current.scale > current.maxScale) current.scale = current.maxScale;
        if (current.scale < current.minScale) current.scale = current.minScale;

        current.transform();
        this.#checkBoundary();
    }

    /** Drag to preview the image */
    #onPreviewZoneDrag(e) {
        e.preventDefault();
        const gallery = this;
        const { current } = this;
        if (!current.contains(e.target)) return;

        current.isMoved = false;
        current.startX = e.clientX;
        current.startY = e.clientY;
        current.css('transition:none; cursor:grab');

        current.onpointermove = function (e) {
            this.isMoved = true;
            this.offsetX = e.clientX - this.startX;
            this.offsetY = e.clientY - this.startY;
            this.style.cursor = 'grabbing';
            this.transform(this.transX + this.offsetX, this.transY + this.offsetY, null);
        }

        current.onpointerup = current.onpointerout = function (e) {
            this.transX += this.offsetX ?? 0;
            this.transY += this.offsetY ?? 0;
            this.style.transition = 'all .3s';
            this.onpointermove = null;

            // Click to zoom in/out
            if (e.type == 'pointerup' && !this.isMoved) {
                const { width, height } = gallery.viewport;
                this.transX = width - this.centerPoint.x - e.clientX;
                this.transY = height - this.centerPoint.y - e.clientY;
                this.scale = this.scale <= this.initScale ? this.scale *= 2 : this.initScale;
                this.transform();
            }
            gallery.#checkBoundary();
        }
    }

    /** The viewport size changed */
    #onViewportResize() {
        if (this.isOpened) {
            this.viewport.width = document.documentElement.clientWidth;
            this.viewport.height = document.documentElement.clientHeight;
            this.#adaptViewport();

            // Update thumbnail size and position to restore
            const { current } = this;
            const { ordinal, index } = current;
            current.rect = this.#getThumbnail(ordinal, index).getBoundingClientRect();
        }
    }

    /** Press esc key to close */
    #onEscPress(e) {
        if (this.isOpened && e.keyCode === 27) this.close();
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
        const { rect } = current;
        // Toggle zoom style of the cursor
        current.style.cursor = current.scale <= current.initScale ? 'zoom-in' : 'zoom-out';

        const width = rect.width * current.scale;
        const height = rect.height * current.scale;
        const bound = {
            x1: current.initX, x2: current.initX,
            y1: current.initY, y2: current.initY
        }
        if (width > this.viewport.width) {
            bound.x1 = width / 2 - current.centerPoint.x;
            bound.x2 = bound.x1 - (width - this.viewport.width);
        }
        if (height > this.viewport.height) {
            bound.y1 = height / 2 - current.centerPoint.y;
            bound.y2 = bound.y1 - (height - this.viewport.height);
        }
        let beyond = false;
        if (current.transX > bound.x1) {
            current.transX = bound.x1;
            beyond = true;
        }
        if (current.transX < bound.x2) {
            current.transX = bound.x2;
            beyond = true;
        }
        if (current.transY > bound.y1) {
            current.transY = bound.y1;
            beyond = true;
        }
        if (current.transY < bound.y2) {
            current.transY = bound.y2;
            beyond = true;
        }
        if (beyond) {
            current.transform();
        }
    }

    /** Get thumbnail from data source */
    #getThumbnail(ordinal, index) {
        const items = this.dataSource[ordinal];
        const max = items.length - 1;
        return index < 0 || index > max ? null : items[index].thumbnail;
    }

    /** Create the preview zone for image */
    #createPreviewZone(source) {
        // Additional attributes
        const { ordinal, index } = source;
        const rect = source.getBoundingClientRect();
        const zone = PlainGallery.createElement('<div class="plga-preview-zone"></div>');
        zone.ordinal = ordinal;
        zone.index = index;
        zone.rect = rect;
        zone.aspectRatio = rect.width / rect.height;
        zone.centerPoint = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        }

        // Additional methods
        zone.css = (text) => {
            let cssText = zone.style.cssText;
            const l = cssText.length - 1;
            if (l >= 0 && cssText.indexOf(';', l) == l) cssText += ';';
            zone.style.cssText = cssText + text;
        }
        zone.transform = (x, y, s) => {
            zone.css(`
                --transX: ${x ?? zone.transX}px;
                --transY: ${y ?? zone.transY}px;
                --scale: ${s ?? zone.scale}
            `);
        }
        zone.restore = () => {
            const { rect } = zone;
            zone.css(`left:${rect.left}px; top:${rect.top}px; width:${rect.width}px; height:${rect.height}px`);
            zone.transform(0, 0, 1);
            zone.ontransitionend = () => zone.remove();
        }

        // Cache the placeholder and original clones to data source
        const item = this.dataSource[ordinal][index];
        if (!item.placeholder) {
            item.placeholder = source.cloneNode(true);
            item.placeholder.className = 'plga-image-placeholder';
        }
        if (!item.original && source.originalUrl) {
            item.original = source.cloneNode(true);
            item.original.className = 'plga-image-placeholder';
            // Set src directly will cause animation to freeze
            zone.ontransitionend = () => {
                item.original.src = source.originalUrl;
                item.original.onload = () => item.loaded = true;
            }
        }

        if (!item.loaded) zone.append(item.placeholder);
        if (item.original) zone.append(item.original);
        zone.css(`left:${rect.left}px; top:${rect.top}px; width:${rect.width}px; height:${rect.height}px`);
        this.shadeMask.el.append(zone);
        return zone;
    }

    /** Open gallery with the specified index */
    open(ordinal, index) {
        const source = this.#getThumbnail(ordinal ?? 0, index ?? 0);
        this.#openViewport(source);
    }

    /** Slide gallery according to the direction */
    slide(direction) {
        // Stop sliding if thumbnail is null (first or last image)
        const { ordinal, index } = this.current;
        const thumbnail = this.#getThumbnail(ordinal, index + direction);
        if (!thumbnail) return;

        // Slide the current image out
        const slideImage = (direction, removeEl) => {
            const { current } = this;
            const { width } = this.viewport;
            direction > 0 ? current.transX -= width : current.transX += width;
            current.scale = current.initScale;
            current.transform();

            if (removeEl) {
                current.ontransitionend = () => current.remove();
            }
        }
        slideImage(direction, true);

        // Slide the prev/next image in
        this.current = this.#createPreviewZone(thumbnail);
        this.current.style.display = 'none'; // Reduce reflow and repaint
        this.#toggleSlideArrows();
        this.#adaptViewport(false);
        slideImage(-direction, false); // Hide from the screen
        this.current.style.display = 'block';

        setTimeout(() => {
            slideImage(direction, false);
            this.fire(PlainGallery.Event.CHANGE, this);
        });
    }

    /** Close gallery */
    close() {
        if (this.isOpened) {
            this.shadeMask.fadeOut();
            this.current.restore();
            this.fire(PlainGallery.Event.CLOSE, this);
            this.isOpened = false;
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

/** Toolbar Module */
PlainGallery.Toolbar = class {

    gallery = null;
    el = PlainGallery.createElement(`<div class="plga-toolbar">
        <div class="plga-toolbar-left"></div>
        <div class="plga-toolbar-right"></div>
    </div>`);

    constructor(gallery) {
        this.gallery = gallery;
        this.left = this.el.querySelector('.plga-toolbar-left');
        this.right = this.el.querySelector('.plga-toolbar-right');

        // Register default widget: counter
        this.register({
            html: '<div class="plga-counter"></div>',
            onInit: (el) => {
                gallery.on(PlainGallery.Event.CHANGE, () => {
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

        // Append toolbar to shade mask
        gallery.shadeMask.el.append(this.el);
    }

    register(options) {
        const { position, html, onInit } = options;
        const { left, right } = this;
        const widget = PlainGallery.createElement(html);

        if (position == 'right') {
            right.insertBefore(widget, right.firstChild);
        } else {
            left.append(widget);
        }
        options.onInit(widget, this.gallery);
    }

}

/** Shade Mask Module */
PlainGallery.ShadeMask = class {

    gallery = null;
    el = PlainGallery.createElement(`<div class="plga-shade-mask">
        <svg class="plga-icon plga-icon-prev" viewBox="0 0 60 60" width="48"><path d="M29 43l-3 3-16-16 16-16 3 3-13 13 13 13z"/></svg>
        <svg class="plga-icon plga-icon-next" viewBox="0 0 60 60" width="48"><path d="m31 43 3 3 16-16-16-16-3 3 13 13Z"/></svg>
    </div>`);

    constructor(gallery) {
        this.gallery = gallery;
        this.#embedStyles();

        this.prevBtn = this.el.querySelector('.plga-icon-prev');
        this.nextBtn = this.el.querySelector('.plga-icon-next');
        this.prevBtn.direction = -1;
        this.nextBtn.direction = 1;
        document.body.append(this.el);
    }

    fadeIn() {
        const { el } = this;
        el.ontransitionend = null;
        el.style.display = 'flex';
        setTimeout(() => el.style.background = 'rgba(0, 0, 0, .8)');
    }

    fadeOut() {
        const { el } = this;
        el.style.background = 'rgba(0, 0, 0, 0)';
        el.ontransitionend = () => el.style.display = 'none';
    }

    #embedStyles() {
        document.head.append(PlainGallery.createElement(`<style>
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
            .plga-preview-zone {
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