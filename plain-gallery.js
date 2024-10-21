/** Core Class */
class PlainGallery extends EventTarget {

    shadeMask = new ShadeMask(this);
    thumbnails = [];
    current = null;

    constructor(target) {
        super();
        window.addEventListener('resize', this.#adaptViewport.bind(this));
        this.#bindSlideEvents();

        // Traverse all thumbnail items
        const items = document.querySelectorAll(target);
        let index = 0;
        for (const item of items) {
            const thumbnail = item.querySelector('img');
            if (!thumbnail) continue;

            this.thumbnails.push(thumbnail);
            thumbnail.index = index++;
            thumbnail.addEventListener('click', e => {
                e.preventDefault();
                this.#openViewport(e.target);
            });
        }
    }

    #openViewport(source) {
        this.current = this.#cloneImage(source);
        this.shadeMask.fadeIn();
        this.#adaptViewport(true);
        this.#bindZoomEvents();
        this.#changeSlideArrows();

        this.fire('open', this.current);
        this.fire('slide', this.current);
    }

    #adaptViewport(delay) {
        if (!this.shadeMask.isOpened) return;
        const scrRatio = innerWidth / innerHeight;
        const img = this.current;

        img.scale = img.aspectRatio > scrRatio ? innerWidth / img.width : innerHeight / img.height;
        img.initScale = img.scale;
        img.minScale = img.scale / 2;
        img.maxScale = img.scale * 10;
        img.initX = img.transX = innerWidth / 2 - img.centerPoint.x;
        img.initY = img.transY = innerHeight / 2 - img.centerPoint.y;

        const adapt = () => { img.translating(); img.scaling(); }
        delay ? setTimeout(adapt) : adapt();
    }

    #bindSlideEvents() {
        const { prevBtn, nextBtn } = this.shadeMask;
        prevBtn.onclick = nextBtn.onclick = (e) => {
            e.stopPropagation();

            // Slide the current image out
            // Stop sliding if thumbnail is null (first or last image)
            const { direction } = e.currentTarget;
            const thumbnail = this.#getThumbnail(this.current.index + direction);
            if (!thumbnail) return;
            this.#slideImage(direction, true);

            // Slide the next image in
            this.current = this.#cloneImage(thumbnail);
            this.#adaptViewport(false);
            this.#slideImage(-direction, false); // Hide from the screen
            this.#bindZoomEvents();
            this.#changeSlideArrows();
            this.shadeMask.updateImage();

            setTimeout(() => {
                this.#slideImage(direction, false);
                this.fire('slide', this.current);
            });
        }
    }

    #bindZoomEvents() {
        const gallery = this;
        const img = this.current;

        // Drag to preview
        img.onpointerdown = function (e) {
            e.preventDefault();
            this.moved = false;
            this.style.transition = 'unset';
            this.style.cursor = 'grab';
            this.startX = e.clientX;
            this.startY = e.clientY;

            this.onpointermove = function (e) {
                this.moved = true;
                this.style.cursor = 'grabbing';
                this.offsetX = e.clientX - this.startX;
                this.offsetY = e.clientY - this.startY;
                this.translating(this.transX + this.offsetX, this.transY + this.offsetY);
            }

            this.onpointerup = this.onpointerout = function (e) {
                this.transX += this.offsetX ?? 0;
                this.transY += this.offsetY ?? 0;
                this.onpointermove = null;
                this.style.transition = 'all .3s';

                // Click to zoom in/out
                if (e.type == 'pointerup' && !this.moved) {
                    this.transX = innerWidth - img.centerPoint.x - e.clientX;
                    this.transY = innerHeight - img.centerPoint.y - e.clientY;
                    this.scale = this.scale <= this.initScale ? this.scale *= 2 : this.initScale;
                    this.translating();
                    this.scaling(this.scale);
                }
                gallery.#switchZoomCursor();
                gallery.#checkImageBoundary();
            }
        };

        // Scroll to zoom
        img.onwheel = function (e) {
            this.scale = e.wheelDelta > 0 ? this.scale * 1.2 : this.scale / 1.2;
            if (this.scale > this.maxScale) this.scale = this.maxScale;
            if (this.scale < this.minScale) this.scale = this.minScale;
            this.scaling();

            gallery.#switchZoomCursor();
            gallery.#checkImageBoundary();
        }
    }

    #getThumbnail(index) {
        const max = this.thumbnails.length - 1;
        return index < 0 || index > max ? null : this.thumbnails[index];
    }

    #slideImage(direction, removeEl) {
        const img = this.current;
        direction > 0 ? img.transX -= innerWidth : img.transX += innerWidth;
        img.scale = img.initScale;
        img.translating();
        img.scaling();

        if (removeEl) {
            img.ontransitionend = () => img.remove();
        }
    }

    #changeSlideArrows() {
        const max = this.thumbnails.length - 1;
        const index = this.current.index;
        const { prevBtn, nextBtn } = this.shadeMask;
        prevBtn.style.visibility = index == 0 ? 'hidden' : 'visible';
        nextBtn.style.visibility = index == max ? 'hidden' : 'visible';
    }

    #switchZoomCursor() {
        const img = this.current;
        img.style.cursor = img.scale <= img.initScale ? 'zoom-in' : 'zoom-out';
    }

    #checkImageBoundary() {
        const img = this.current;
        const width = img.width * img.scale;
        const height = img.height * img.scale;
        const bound = {
            x1: img.initX, x2: img.initX,
            y1: img.initY, y2: img.initY
        }
        if (width > innerWidth) {
            bound.x1 = width / 2 - img.centerPoint.x;
            bound.x2 = bound.x1 - (width - innerWidth);
        }
        if (height > innerHeight) {
            bound.y1 = height / 2 - img.centerPoint.y;
            bound.y2 = bound.y1 - (height - innerHeight);
        }
        if (img.transX > bound.x1) {
            img.transX = bound.x1;
            img.translating();
        }
        if (img.transX < bound.x2) {
            img.transX = bound.x2;
            img.translating();
        }
        if (img.transY > bound.y1) {
            img.transY = bound.y1;
            img.translating();
        }
        if (img.transY < bound.y2) {
            img.transY = bound.y2;
            img.translating();
        }
    }

    #cloneImage(source) {
        const rect = source.getBoundingClientRect();
        const clone = source.cloneNode(true);
        clone.index = source.index;
        clone.className = 'pg-slide-item';
        clone.style.left = rect.left;
        clone.style.top = rect.top;

        clone.aspectRatio = rect.width / rect.height;
        clone.centerPoint = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        }

        clone.translating = (x, y) => {
            clone.style.setProperty('--transX', (x ?? clone.transX) + 'px');
            clone.style.setProperty('--transY', (y ?? clone.transY) + 'px');
        }
        clone.scaling = (scale) => {
            clone.style.setProperty('--scale', scale ?? clone.scale);
        }
        clone.restore = () => {
            clone.translating(0, 0);
            clone.scaling(1);
            clone.ontransitionend = () => clone.remove();
        }
        return clone;
    }

    open(index) {
        const source = this.#getThumbnail(index);
        this.#openViewport(source);
    }

    close() {
        this.shadeMask.fadeOut();
    }

    on(type, callback) {
        this.addEventListener(type, e => callback(e.detail));
    }

    fire(type, detail) {
        this.dispatchEvent(new CustomEvent(type, { detail }));
    }

}

/** Toolbar Component */
class Toolbar {

    el = document.createElement('div');

    constructor(shadeMask) {
        this.el.className = 'pg-toolbar';

        const left = document.createElement('div');
        left.innerHTML = 'left'
        const right = document.createElement('div');
        right.innerHTML = 'right'

        const icon = document.createElement('a');
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 16 16"><path d="M13.854 2.146a.5.5 0 0 1 0 .708l-11 11a.5.5 0 0 1-.708-.708l11-11a.5.5 0 0 1 .708 0Z"/><path d="M2.146 2.146a.5.5 0 0 0 0 .708l11 11a.5.5 0 0 0 .708-.708l-11-11a.5.5 0 0 0-.708 0Z"/></svg>';
        icon.onclick = () => shadeMask.fadeOut();
        right.append(icon);

        this.el.append(left);
        this.el.append(right);

        shadeMask.modal.append(this.el);
    }

}

/** Shade Mask Component */
class ShadeMask {

    modal = document.createElement('div');
    prevBtn = document.createElement('a');
    nextBtn = document.createElement('a');
    isOpened = false;
    toolbar = new Toolbar(this);

    constructor(gallery) {
        this.gallery = gallery;
        this.embedStyles();

        // Add previous button to modal
        this.prevBtn.className = 'pg-arrow-icon';
        this.prevBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 16 16"><path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/></svg>';
        this.prevBtn.direction = -1;
        this.modal.append(this.prevBtn);

        // Add next button to modal
        this.nextBtn.className = 'pg-arrow-icon';
        this.nextBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 16 16"><path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/></svg>';
        this.nextBtn.direction = 1;
        this.modal.append(this.nextBtn);

        // Add modal mask to body
        this.modal.className = 'pg-shade-mask';
        this.modal.addEventListener('click', this.fadeOut.bind(this));
        window.addEventListener('keyup', this.fadeOut.bind(this));
        document.body.append(this.modal);
    }

    fadeIn() {
        this.updateImage();
        this.modal.ontransitionend = null;
        this.modal.style.display = 'flex';
        setTimeout(() => this.modal.style.background = 'rgba(0, 0, 0, .8)');
        this.isOpened = true;
    }

    fadeOut(e) {
        if (e && e.keyCode && e.keyCode !== 27) return;
        if (e && e.target != this.modal) return;
        this.modal.style.background = 'rgba(0, 0, 0, 0)';
        this.modal.ontransitionend = () => this.modal.style.display = 'none';
        this.gallery.current.restore();
        this.isOpened = false;
    }

    updateImage() {
        this.modal.append(this.gallery.current);
    }

    embedStyles() {
        const style = document.createElement('style');
        document.head.append(style);
        style.textContent = `
            .pg-shade-mask {
                user-select: none;
                display: none;
                justify-content: space-between;
                align-items: center;
                position: fixed;
                z-index: 998;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0);
                transition: all .3s;
            }
            .pg-shade-mask svg.icon {
                width: 24px;
                height: 24px;
                fill: currentcolor;
                cursor: pointer;
                opacity: .6;
                transition: all .3s;
            }
            .pg-shade-mask svg.icon:hover {
                opacity: 1;
            }
            .pg-arrow-icon {
                z-index: 999;
                padding: 20px;
                color: #fff;
            }
            .pg-toolbar {
                position: absolute;
                top: 0; left: 0; right:0;
                height: 60px;
                padding: 0 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                color: #fff;
                background: red;
            }
            .pg-toolbar>div {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .pg-slide-item {
                position: absolute;
                cursor: zoom-in;
                transform: translate(var(--transX), var(--transY)) scale(var(--scale));
                transition: all .3s;
            }
        `;
    }

}