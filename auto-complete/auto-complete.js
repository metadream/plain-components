/**
 * 自动完成组件
 * const ac = new AutoComplete('input');
 * ac.onFetch = (keyword) => [{id: 'apple', text: '苹果'}];
 * ac.onSelect = (entry) => console.log(entry);
 */
class AutoComplete {

    // 初始化
    constructor(selector) {
        this.$input = typeof selector === 'string' ? document.querySelector(selector) : selector;
        this.isCompositing = false;
        this.focusIndex = -1;
        this.$dataItems = [];
        this.fetchFn = null;
        this.selectFn = null;

        // 搜索框样式及事件绑定
        this.$input.autocomplete = 'off';
        this.$input.parentNode.classList.add('autocomplete');
        this.$input.addEventListener('compositionstart', e => this.onComposition(e));
        this.$input.addEventListener('compositionend', e => this.onComposition(e));
        this.$input.addEventListener('focus', e => this.onInput(e));
        this.$input.addEventListener('input', e => this.onInput(e));
        this.$input.addEventListener("keydown", e => this.onKeyDown(e));

        // 空白处点击事件绑定
        document.addEventListener("click", e => {
            this.clearDatalist(e.target);
        });
    }

    // 获取数据源的方法（支持异步）
    set onFetch(fn) {
        this.fetchFn = fn;
    }

    // 选择数据项后的回调
    set onSelect(fn) {
        this.selectFn = fn;
    }

    // 中文输入法事件优化
    onComposition(e) {
        if (e.type === 'compositionend') {
            this.isCompositing = false;
            if (!this.isCompositing) this.onInput(e);
        } else {
            this.isCompositing = true
        }
    }

    // 关键字输入事件
    async onInput(e) {
        if (this.isCompositing) return;

        const keyword = e.target.value.trim();
        this.focusIndex = -1;
        this.$dataItems.length = 0;
        this.clearDatalist();

        const rect = this.$input.getBoundingClientRect();
        const $datalist = document.createElement('div');
        $datalist.classList.add('datalist');
        $datalist.style.top = rect.bottom + 'px';
        $datalist.style.left = rect.left + 'px';
        $datalist.style.minWidth = rect.width + 'px';
        document.body.append($datalist);

        const datalist = this.fetchFn ? await this.fetchFn(keyword) : [];
        if (!Array.isArray(datalist)) return;

        for (const entry of datalist) {
            const $item = document.createElement('div');
            $datalist.appendChild($item);
            this.$dataItems.push($item);

            $item.innerHTML = entry.text;
            $item.addEventListener("click", () => {
                this.clearDatalist();
                if (this.selectFn) {
                    this.selectFn(entry, this.$input);
                } else {
                    this.$input.value = entry.text;
                }
            });
        }
    }

    // 上下箭头按键事件
    onKeyDown(e) {
        if (e.keyCode == 40) { // down
            this.activeFocusItem(++this.focusIndex);
        } else if (e.keyCode == 38) { //up
            this.activeFocusItem(--this.focusIndex);
        } else if (e.keyCode == 13 && this.focusIndex > -1) {
            this.$dataItems[this.focusIndex].click();
        }
    }

    // 选中列表中的数据项
    activeFocusItem() {
        if (!this.$dataItems.length) return;
        for (const $item of this.$dataItems) {
            $item.classList.remove("selected");
        }

        const maxIndex = this.$dataItems.length - 1;
        if (this.focusIndex > maxIndex) this.focusIndex = 0;
        if (this.focusIndex < 0) this.focusIndex = maxIndex;

        const $focusItem = this.$dataItems[this.focusIndex];
        $focusItem.classList.add("selected");
        $focusItem.scrollIntoView({ block: "nearest", inline: "nearest" });
    }

    // 清空数据列表
    clearDatalist(target) {
        const $datalist = document.querySelector(".datalist");
        if ($datalist != null && target != $datalist && target != this.$input) {
            $datalist.remove();
        }
    }

}
