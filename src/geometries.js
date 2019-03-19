import {Mesh, Group, PlaneBufferGeometry, MeshBasicMaterial} from "three";

import {connectMulti} from "w3g/utils";
import {connectColor} from "w3g/threeutil";
import Element from "w3g/element";
import {hitTestEllipse} from 'w3g/hittest';

const plane = new PlaneBufferGeometry(1, 1);
export class Mark extends Element {
	constructor(options) {
		const material = new MeshBasicMaterial({color: options.strokeColor});

		super(new Group(), options);

		this.vertical = new Mesh(plane, material);
		this.nativeContent.add(this.vertical);

		this.horizontal = new Mesh(plane, material);
		this.nativeContent.add(this.horizontal);

		this.vertical.scale.set(options.strokeWidth, options.height, 1);
		this.horizontal.scale.set(options.width, options.strokeWidth, 1);

		connectColor(this, "strokeColor", material, "color", this.nativeContent);
		connectMulti(this, "strokeWidth", [this.vertical.scale, this.horizontal.scale], ["x", "y"]);
	}

	get width() {return this.horizontal.scale.x}
	set width(v) {
		if (!this.horizontal) return;
		this.horizontal.scale.x = v;
	}

	get height() {return this.vertical.scale.y}
	set height(v) {
		if (!this.vertical) return;
		this.vertical.scale.y = v;
	}
}
