import {Group, Mesh, RingGeometry, MeshBasicMaterial, Vector2, DoubleSide} from "three";

import ElementManager from "./elementmanager";
import {windScaleY} from "./constants";

export default class WindManager extends ElementManager {

	time = 0;
	playerY = 0;

	constructor(ts) {
		super();
		this.threescene = ts;
	}

	create(r, c) {
		const wind = {
			v: r.v || 2, size: r.size || 100,
			position: r || new Vector2(),
			group: new Group(), update: () => {}
		};
		wind.mesh = new Mesh(
			new RingGeometry(wind.size - 0.4, wind.size, 50, 5),
			new MeshBasicMaterial({color: c, side: DoubleSide})
		);
		wind.mesh.position.set(wind.position.x, 0, wind.position.y);
		connect(wind.position, "x", wind.group.position);
		connect(wind.position, "y", wind.group.position, "z");
		for (const i = -10000 * Math.sign(wind.v); Math.abs(i) <= 10000; i += wind.v * windScaleY) {
			const ring = wind.mesh.clone();
			wind.group.add(ring);
			ring.rotateX(Math.PI / 2);
			ring.position.y = this.playerY + i;
		}
		this.threescene.add(wind.group);
		this.elements.push(wind);
		return wind;
	}

	update() {
		this.forEach(wind => {
			wind.group.position.y += wind.v;
			if (Math.abs(wind.group.position.y) >= wind.v * windScaleY) wind.group.position.y -= wind.v * windScaleY;
		});
		this.time++;
	}

	remove(i) {
		this.threescene.remove(this.get(i).group);
		super.remove(i);
	}
}
