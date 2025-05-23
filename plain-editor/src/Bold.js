// import { Toolbar } from "./Toolbar.js";

export class Bold extends HTMLElement {

    // private button!: HTMLElement;

    constructor() {
        super();
        this.button = document.createElement('button');
        this.button.innerHTML = 'bold';
        this.button.onclick = function () {
            const selection = window.getSelection().getRangeAt(0);
            const content = selection.extractContents();
            console.log(content.firstChild)

            const $wrapper = document.createElement("strong");
            $wrapper.appendChild(content);
            selection.insertNode($wrapper);
        }

        console.log(this)
    }

    // getElement(): HTMLElement {
    //     return this.button;
    // }

}