import {Mesh, Group, PlaneBufferGeometry, MeshBasicMaterial} from "three";

import {connect, connectMulti} from "w3g/utils";
import {connectColor} from "w3g/threeutil";
import Element from "w3g/element";
import {hitTestEllipse} from 'w3g/hittest';

export class Mark extends Element {
	constructor(options) {
		const group = new Group();

		const material = new MeshBasicMaterial({color: options.strokeColor});

		const vertical = new Mesh(new PlaneBufferGeometry(1, 1), material);
		group.add(vertical);

		const horizontal = new Mesh(new PlaneBufferGeometry(1, 1), material);
		group.add(horizontal);

		super(group, options);

		vertical.scale.set(options.strokeWidth, options.height, 1);
		horizontal.scale.set(options.width, options.strokeWidth, 1);

		connectColor(this, "strokeColor", material, "color", group);
		connect(this, "width", horizontal.scale, "x");
		connect(this, "height", vertical.scale, "y");
		connectMulti(this, "strokeWidth", [vertical.scale, horizontal.scale], ["x", "y"]);
	}
}
