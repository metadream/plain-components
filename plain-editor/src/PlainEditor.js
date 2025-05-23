Object.assign(Element.prototype, {
    css(styles) {
        for (const [prop, value] of Object.entries(styles)) this.style[prop] = value;
        return this;
    }
});

class PlainEditor {

    #editor;

    constructor(options) {
        const { container, editable, toolbar } = options;
        const $container = typeof container === 'string' ? document.querySelector(container) : container;
        $container.css({ borderRadius: '5px', border: '#ccc 1px solid' });

        const $editor = this.#editor = document.createElement('div');
        $editor.setAttribute('contenteditable', editable === undefined ? true : editable);
        $editor.css({ minHeight: '300px', outline: '0', padding: '15px' });

        const $toolbar = document.createElement('div');
        $toolbar.css({ padding: '5px', borderBottom: '#ccc 1px solid' });
        for (const button of toolbar) {
            const $button = (new button()).element;
            $button.css({ color: '#999' });
            $toolbar.append($button);
        }

        $container.append($toolbar);
        $container.append($editor);
    }

    get content() {
        return this.#editor.innerHTML;
    }

    set content(html) {
        this.#editor.innerHTML = html;
    }
}

class ToolButton {
    el;

    constructor() {
        this.el = document.createElement('button');
        this.el.innerHTML = this.constructor.icon;
        this.el.css({
            display: 'inline-flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            backgroundColor: '#fff',
            transition: '.3s all',
            border: '0',
            borderRadius: '5px',
            padding: '3px',
            marginRight: '3px',
            width: '30px',
            height: '30px',
        });

        this.el.onmouseover = () => {
            this.el.style.backgroundColor = '#eee'
        }
        this.el.onmouseout = () => {
            this.el.style.backgroundColor = '#fff'
        }
        this.el.onclick = () => {
            this.format();
            this.el.style.color = '#333';
        }
    }

    execCommand(name, args) {
        document.execCommand(name, false, args);
    }

    get element() {
        return this.el;
    }
}

class Bold extends ToolButton {
    static icon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M9 12L9 7.1C9 7.04477 9.04477 7 9.1 7H10.4C11.5 7 14 7.1 14 9.5C14 9.5 14 12 11 12M9 12V16.8C9 16.9105 9.08954 17 9.2 17H12.5C14 17 15 16 15 14.5C15 11.7046 11 12 11 12M9 12H11"></path></svg>';
    format() {
        this.execCommand('bold');
    }
}

class Link extends ToolButton {
    static icon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M7.69998 12.6L7.67896 12.62C6.53993 13.7048 6.52012 15.5155 7.63516 16.625V16.625C8.72293 17.7073 10.4799 17.7102 11.5712 16.6314L13.0263 15.193C14.0703 14.1609 14.2141 12.525 13.3662 11.3266L13.22 11.12"></path><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M16.22 11.12L16.3564 10.9805C17.2895 10.0265 17.3478 8.5207 16.4914 7.49733V7.49733C15.5691 6.39509 13.9269 6.25143 12.8271 7.17675L11.3901 8.38588C10.0935 9.47674 9.95706 11.4241 11.0888 12.6852L11.12 12.72"></path></svg>';
    format() {
        this.execCommand('createLink', 'https://baidu.com');
    }
}

class Heading extends ToolButton {
    static icon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M9 7L9 12M9 17V12M9 12L15 12M15 7V12M15 17L15 12"></path></svg>';
    format() {
        this.execCommand('formatBlock', 'H3');
    }
}

class Quote extends ToolButton {
    static icon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 10.8182L9 10.8182C8.80222 10.8182 8.60888 10.7649 8.44443 10.665C8.27998 10.5651 8.15181 10.4231 8.07612 10.257C8.00043 10.0909 7.98063 9.90808 8.01922 9.73174C8.0578 9.55539 8.15304 9.39341 8.29289 9.26627C8.43275 9.13913 8.61093 9.05255 8.80491 9.01747C8.99889 8.98239 9.19996 9.00039 9.38268 9.0692C9.56541 9.13801 9.72159 9.25453 9.83147 9.40403C9.94135 9.55353 10 9.72929 10 9.90909L10 12.1818C10 12.664 9.78929 13.1265 9.41421 13.4675C9.03914 13.8084 8.53043 14 8 14"></path><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 10.8182L15 10.8182C14.8022 10.8182 14.6089 10.7649 14.4444 10.665C14.28 10.5651 14.1518 10.4231 14.0761 10.257C14.0004 10.0909 13.9806 9.90808 14.0192 9.73174C14.0578 9.55539 14.153 9.39341 14.2929 9.26627C14.4327 9.13913 14.6109 9.05255 14.8049 9.01747C14.9989 8.98239 15.2 9.00039 15.3827 9.0692C15.5654 9.13801 15.7216 9.25453 15.8315 9.40403C15.9414 9.55353 16 9.72929 16 9.90909L16 12.1818C16 12.664 15.7893 13.1265 15.4142 13.4675C15.0391 13.8084 14.5304 14 14 14"></path></svg>';
    format() {
        this.execCommand('formatBlock', 'BLOCKQUOTE');
    }
}

class Image extends ToolButton {
    static icon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><rect width="14" height="14" x="5" y="5" stroke="currentColor" stroke-width="2" rx="4"></rect><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.13968 15.32L8.69058 11.5661C9.02934 11.2036 9.48873 11 9.96774 11C10.4467 11 10.9061 11.2036 11.2449 11.5661L15.3871 16M13.5806 14.0664L15.0132 12.533C15.3519 12.1705 15.8113 11.9668 16.2903 11.9668C16.7693 11.9668 17.2287 12.1705 17.5675 12.533L18.841 13.9634"></path><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.7778 9.33331H13.7867"></path></svg>';
    format() {
        this.execCommand('insertImage', 'https://www.baidu.com/img/PCtm_d9c8750bed0b3c7d089fa7d55720d6cf.png');
    }
}

class OrderedList extends ToolButton {
    static icon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><line x1="12" x2="19" y1="7" y2="7" stroke="currentColor" stroke-linecap="round" stroke-width="2"></line><line x1="12" x2="19" y1="12" y2="12" stroke="currentColor" stroke-linecap="round" stroke-width="2"></line><line x1="12" x2="19" y1="17" y2="17" stroke="currentColor" stroke-linecap="round" stroke-width="2"></line><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M7.79999 14L7.79999 7.2135C7.79999 7.12872 7.7011 7.0824 7.63597 7.13668L4.79999 9.5"></path></svg>';
    format() {
        this.execCommand('insertOrderedList');
    }
}

class UnorderedList extends ToolButton {
    static icon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><line x1="9" x2="19" y1="7" y2="7" stroke="currentColor" stroke-linecap="round" stroke-width="2"></line><line x1="9" x2="19" y1="12" y2="12" stroke="currentColor" stroke-linecap="round" stroke-width="2"></line><line x1="9" x2="19" y1="17" y2="17" stroke="currentColor" stroke-linecap="round" stroke-width="2"></line><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M5.00001 17H4.99002"></path><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M5.00001 12H4.99002"></path><path stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M5.00001 7H4.99002"></path></svg>';
    format() {
        this.execCommand('insertUnorderedList');
    }
}

// redo undo 
// italic underline strikeThrough unlink backColor #fcf9d5 #fef6d5

class Clean extends ToolButton {
    static icon = 'Clean';
    format() {
        this.execCommand('removeFormat');
    }
}