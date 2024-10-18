// TODO
// 放大后再滑动，滑动距离不够
// 第一张或最后一张关闭 or 隐藏箭头

/** Core Component */
class PlainGallery {

    shadeMask = new ShadeMask(this);
    thumbnails = [];
    isOpened = false;
    current = null;

    constructor(target) {
        this.embedStyles();
        this.bindSlideEvents();
        window.addEventListener('resize', this.adaptViewport.bind(this));

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
                this.openViewport(e.target);
            });
        }
    }

    openViewport(source) {
        this.current = this.cloneImage(source);
        this.isOpened = true;
        this.adaptViewport(true);
        this.bindZoomEvents();
        this.shadeMask.open();
    }

    adaptViewport(delay) {
        if (!this.isOpened) return;

        const scrRatio = innerWidth / innerHeight;
        const img = this.current;
        img.scale = img.aspectRatio > scrRatio ? innerWidth / img.width : innerHeight / img.height;
        img.initScale = img.scale;
        img.minScale = img.scale / 2;
        img.maxScale = img.scale * 10;
        img.initX = img.transX = innerWidth / 2 - img.centerPoint.x;
        img.initY = img.transY = innerHeight / 2 - img.centerPoint.y;

        const adapt = () => {
            img.translating();
            img.scaling();
        }
        delay ? setTimeout(adapt) : adapt();
    }

    bindSlideEvents() {
        const { prevBtn, nextBtn } = this.shadeMask;
        prevBtn.onclick = nextBtn.onclick = (e) => {
            e.stopPropagation();

            // Stop sliding if the first or last image
            const { direction } = e.currentTarget;
            const thumbnail = this.getThumbnail(direction);
            if (!thumbnail) return;

            // Slide the current image out
            this.slideImage(direction, true);

            // Slide the next image in
            this.current = this.cloneImage(thumbnail);
            this.adaptViewport(false);
            this.bindZoomEvents();
            this.slideImage(-direction, false);
            this.shadeMask.open();

            setTimeout(() => {
                this.slideImage(direction, false);
            });
        }
    }

    bindZoomEvents() {
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
                gallery.changeCursor(this);
                gallery.checkBoundary(this);
            }
        };

        // Scroll to zoom
        img.onwheel = function (e) {
            this.scale = e.wheelDelta > 0 ? this.scale * 1.2 : this.scale / 1.2;
            if (this.scale > this.maxScale) this.scale = this.maxScale;
            if (this.scale < this.minScale) this.scale = this.minScale;

            this.scaling();
            gallery.changeCursor(this);
            gallery.checkBoundary(this);
        }
    }

    slideImage(direction, remove) {
        const img = this.current;
        direction > 0 ? img.transX -= innerWidth : img.transX += innerWidth;
        img.translating();

        if (remove) {
            img.ontransitionend = () => img.remove();
        }
    }

    getThumbnail(direction) {
        const max = this.thumbnails.length - 1;
        const index = this.current.index + direction;
        if (index > max) return null;
        if (index < 0) return null;
        return this.thumbnails[index];
    }

    restore() {
        const img = this.current;
        img.translating(0, 0);
        img.scaling(1);
        img.ontransitionend = () => img.remove();
        this.isOpened = false;
    }

    changeCursor(img) {
        if (img.scale <= img.initScale) {
            img.style.cursor = 'zoom-in';
        } else {
            img.style.cursor = 'zoom-out';
        }
    }

    checkBoundary(img) {
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

    cloneImage(source) {
        const rect = source.getBoundingClientRect();
        const clone = source.cloneNode(true);
        clone.index = source.index;
        clone.className = 'pg-img-preview';
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
        return clone;
    }

    embedStyles() {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.append(style);
    }
}

/** Toolbar Component */
class Toolbar {

}

/** Shade Mask Component */
class ShadeMask {

    modal = document.createElement('div');
    prevBtn = document.createElement('a');
    nextBtn = document.createElement('a');

    constructor(gallery) {
        // Add previous button
        this.prevBtn.className = 'pg-btn-slide';
        this.prevBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/></svg>';
        this.prevBtn.direction = -1;
        this.modal.append(this.prevBtn);

        // Add next button
        this.nextBtn.className = 'pg-btn-slide';
        this.nextBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/></svg>';
        this.nextBtn.direction = 1;
        this.modal.append(this.nextBtn);

        // Add modal mask
        this.gallery = gallery;
        this.modal.className = 'pg-shade-mask';
        document.body.append(this.modal);
    }

    open() {
        // Fade in
        this.modal.append(this.gallery.current);
        this.modal.ontransitionend = null;
        this.modal.style.display = 'flex';
        setTimeout(() => this.modal.style.background = 'rgba(0, 0, 0, .8)');

        // Fade out
        const fadeOut = (e) => {
            if (e.keyCode && e.keyCode !== 27) return;
            if (e.target == this.gallery.current) return;

            this.gallery.restore();
            this.modal.style.background = 'rgba(0, 0, 0, 0)';
            this.modal.ontransitionend = () => this.modal.style.display = 'none';
            this.modal.removeEventListener('click', fadeOut);
            window.removeEventListener('keyup', fadeOut);
        }

        this.modal.addEventListener('click', fadeOut);
        window.addEventListener('keyup', fadeOut);
    }
}

const css = `
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
.pg-btn-slide {
    z-index: 999;
    padding: 10px;
    color: #fff;
    cursor: pointer;
}
.pg-img-preview {
    position: absolute;
    cursor: zoom-in;
    transform: translate(var(--transX), var(--transY)) scale(var(--scale));
    transition: all .3s;
}
`;