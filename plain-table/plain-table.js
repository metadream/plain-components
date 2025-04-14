class PlainTable {
    #container;
    #options;
    #plainHead;
    #plainBody;
    #headTable;
    #bodyTable;

    constructor(container, options) {
        this.#container = typeof container === 'string'
            ? document.querySelector(container) : container;
        this.#options = Object.assign({
            width: 0,
            height: 0,
            bordered: false,
            frozenColumns: [0, 0],
            columns: [],
            data: []
        }, options);

        this.#buildTable();
        this.#loadData();
        this.#syncColumnWidths();
        this.#updatePinShadows();

        window.addEventListener('resize', () => {
            this.#syncColumnWidths();
            this.#updatePinShadows();
        });
        this.#plainBody.addEventListener('scroll', () => {
            this.#plainHead.scrollLeft = this.#plainBody.scrollLeft; // 同步横向滚动
            this.#updatePinShadows();
        });
    }

    /** 利用两个Table构建可冻结表格 */
    #buildTable() {
        this.#container.innerHTML = '';
        this.#container.className = 'plain-table';
        if (this.#options.bordered) {
            this.#container.classList.add('plain-table-bordered');
        }

        // 创建表头
        this.#plainHead = this.#createElement('<div class="plain-table-head"></div>');
        this.#headTable = this.#createElement('table');
        this.#plainHead.append(this.#headTable);
        this.#container.append(this.#plainHead);

        // 添加表头列
        const headRow = this.#headTable.insertRow();
        for (const column of this.#options.columns) {
            const th = this.#createElement(`<th><div>${column.title}</div></th>`);
            headRow.append(th);
        }

        // 在最后一列添加滚动条占位
        const placeholder = this.#createElement('<th class="plain-table-cell-frozen plain-table-placeholder"></th>');
        headRow.append(placeholder);

        // 创建空表体
        this.#plainBody = this.#createElement('<div class="plain-table-body"></div>');
        if (this.#options.height) {
            this.#plainBody.style.height = this.#options.height + 'px';
        }
        this.#bodyTable = this.#createElement('table');
        if (this.#options.width) {
            this.#bodyTable.style.minWidth = this.#options.width + 'px';
        }
        this.#plainBody.append(this.#bodyTable);
        this.#container.append(this.#plainBody);
    }

    /** 加载表体数据 */
    #loadData() {
        for (const item of this.#options.data) {
            const bodyRow = this.#bodyTable.insertRow();
            for (const column of this.#options.columns) {
                bodyRow.insertCell().innerHTML = `<div>${item[column.field] || ''}</div>`;
            }
        }
    }

    /** 同步表头列和表体列宽度 */
    #syncColumnWidths() {
        const firstBodyRow = this.#bodyTable.querySelector('tr:first-child');
        if (!firstBodyRow) return;

        // 调整表体列宽度与表头列宽度一致
        const headCells = this.#headTable.querySelectorAll('th:not(.plain-table-placeholder)');
        const bodyCells = firstBodyRow.children;
        for (let i = 0; i < bodyCells.length; i++) {
            let width = bodyCells[i].getBoundingClientRect().width + 'px';
            headCells[i].style.width = width;
        }
        this.#freezeColumns();
    }

    /** 冻结列 */
    #freezeColumns() {
        const { frozenColumns, columns } = this.#options;
        if (!Array.isArray(frozenColumns)) return;
        const left = frozenColumns[0] ?? 0;
        const right = frozenColumns[1] ?? 0;
        if (left + right >= columns.length) return;
        const rows = this.#container.querySelectorAll('.plain-table-head tr, .plain-table-body tr');
        if (left > 0 && left < columns.length) this.#freezeLeftColumns(rows, left);
        if (right > 0 && right < columns.length) this.#freezeRightColumns(rows, right);
    }

    /** 冻结左边的列 */
    #freezeLeftColumns(rows, maxPos) {
        for (const row of rows) {
            const cols = row.cells;
            let offset = 0, pos = maxPos - 1;
            for (let i = 0; i < cols.length; i++) {
                if (i <= pos) {
                    cols[i].classList.add('plain-table-cell-frozen');
                    if (i == pos) {
                        cols[i].classList.add('plain-table-cell-frozen-last');
                    }
                    cols[i].style.left = offset + 'px';
                    offset += cols[i].getBoundingClientRect().width;
                }
            }
        }
    }

    /** 冻结右边的列 */
    #freezeRightColumns(rows, maxPos) {
        for (const row of rows) {
            let offset = 0;
            const placeholder = row.querySelector('.plain-table-placeholder');
            if (placeholder) offset = 10;

            const cols = row.cells;
            for (let i = cols.length - 1; i >= 0; i--) {
                let j = cols.length - i;
                if (placeholder) j--;
                if (cols[i] == placeholder) {
                    continue;
                }

                if (j <= maxPos) {
                    cols[i].classList.add('plain-table-cell-frozen');
                    if (j == maxPos) {
                        cols[i].classList.add('plain-table-cell-frozen-first');
                    }
                    cols[i].style.right = offset + 'px';
                    offset += cols[i].getBoundingClientRect().width;
                }
            }
        }
    }

    /** 更新冻结列阴影 */
    #updatePinShadows() {
        const scrollLeft = this.#plainBody.scrollLeft;
        const maxScrollLeft = this.#plainBody.scrollWidth - this.#plainBody.clientWidth;
        // 控制左侧阴影
        if (scrollLeft > 0) this.#container.classList.add('plain-table-pin-left');
        else this.#container.classList.remove('plain-table-pin-left');
        // 控制右侧阴影
        if (scrollLeft < maxScrollLeft) this.#container.classList.add('plain-table-pin-right');
        else this.#container.classList.remove('plain-table-pin-right');
    }

    /** 创建元素 */
    #createElement(content) {
        if (!content) return;
        content = content.replace(/[\t\r\n]/mg, '').trim();
        if (content.indexOf('<') === 0) {
            const template = document.createElement('template');
            template.innerHTML = content;
            return template.content.firstElementChild.cloneNode(true);
        }
        return document.createElement(content);
    }

}