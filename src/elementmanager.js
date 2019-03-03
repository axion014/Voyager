import {EventDispatcher} from "three";

import {defineAccessor} from "w3g/utils";

export default class ElementManager extends EventDispatcher {

	elements = [];

	add(v) {this.elements.push(v);}
	update() {this.forEach(element => element.update.apply(this, arguments));}
	get(i) {return this.elements[i];}
	remove(i) {this.elements.splice(i, 1);}
	forEach(f, t) {this.elements.forEach(f, t);}
}

defineAccessor(ElementManager.prototype, "count", {
	get() {return this.elements.length},
	set(v) {this.elements.length = v}
});
