import {Ellipse} from "w3g/geometries";
import {define, defineAccessor} from "w3g/utils";

import {minimapScale, raderRadius} from "./constants";

function update(point, obj) {
	let distance = Math.hypot(obj.position.x, obj.position.z);
	if (distance > raderRadius) {
		point._visible1 = false;
		return;
	}
	point._visible1 = true;
	distance *= minimapScale;
	distance = Math.min(distance, this.width);
	const angle = Math.atan2(obj.position.x, obj.position.z);
	point.position.set(Math.sin(angle) * distance, -Math.cos(angle) * distance, 0);
};

export default class Minimap extends Ellipse {
	elements = new Map();

	addObject(obj, options) {
		const point = new Ellipse(Object.assign({
			radius: 3, strokeColor: 'black', strokeWidth: 1, opacity: 0.5
		}, options || {}));
		this.elements.set(obj, point);
		defineAccessor(point, "visible", {
			get() {return this._visible1 && this._visible2},
			set(v) {this._visible2 = v}
		});
		point.visible = true;
		this.add(point);
		update.call(this, point, obj);
		return point;
	}
	getObject(obj) {return this.elements.get(obj)}
	removeObject(obj) {
		const point = this.getObject(obj);
		define(point, "visible", point.visible);
		this.remove(point);
		this.elements.delete(obj);
	}
	update() {this.elements.forEach(update, this)};
}
