import {EventDispatcher} from "three";

import {connect} from "w3g/utils";

export default class ElementManager extends EventDispatcher {

	elements = [];

	constructor() {
		connect(this, "count", this.elements, "length");
	}

	update() {this.forEach(element => element.update());}
	get(i) {return this.elements[i];}
	remove(i) {this.elements.splice(i, 1);}
	forEach(f, t) {this.elements.forEach(f, t);}
}
