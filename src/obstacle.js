import {Mesh, BoxGeometry, MeshStandardMaterial} from "three";

import ElementManager from "./elementmanager";

export default class ObstacleManager extends ElementManager {

	constructor(ts) {
		super();
		this.threescene = ts;
	}

	create(p, q, s) {
		const obstacle = new Mesh(
			new BoxGeometry(s.x, s.y, s.z), new MeshStandardMaterial({color: '#888'})
		);
		obstacle.position.copy(p);
		obstacle.quaternion.copy(q);
		obstacle.size = s;
		this.threescene.add(obstacle);
		this.elements.push(obstacle);
		return obstacle;
	}

	update() {}

	remove(i) {
		this.get(i).parent.remove(this.get(i));
		super.remove(i);
	}
}
