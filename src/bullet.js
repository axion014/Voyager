import {
	Mesh,
	SphereGeometry,
	ShaderMaterial,
	Vector3, Color,
	FrontSide
} from "three";

import {get, free} from "w3g/utils";
import {Axis, deepclone} from "w3g/threeutil";
import assets from "w3g/loading";

import ElementManager from "./elementmanager";

const bulletScale = 2;

export default class BulletManager extends ElementManager {

	constructor(s, c) {
		super();
		this.scene = s;
		// Put some variant of model for the bullets here
		// maybe laser
		this.models = {
			bullet: assets.THREE_Model_GLTF.bullet.clone(),
			laser: new Mesh(new SphereGeometry(2, 16, 16), new ShaderMaterial({
        uniforms: {
          c: {type: "f", value: 0},
          p: {type: "f", value: 3},
          glowColor: {type: "c", value: new Color(0xffff00)}
        },
        vertexShader: assets.GLSL.glowVertex,
        fragmentShader: assets.GLSL.glowFragment,
				side: FrontSide,
        transparent: true
      }))
		};
		this.models.laser.scale.z = 4;
		// Material pool to reduce GC, is this right way to increase performance?
		this.materials = {
			bullet: [],
			laser: []
		};
		this.cloneMaterial = c;
	}

	create(n, r, k) {
		if (k === undefined) k = this.cloneMaterial;
		const bullet = Object.assign(
			deepclone(this.models[n], false, k && this.materials[n].length === 0), {
			v: 1, size: 1, atk: 1, ownMaterial: k,
			update(delta) {
				this.position.addScaledVector(this.velocity, delta);
			}
		}, r);
		if (k && this.materials[n].length !== 0) bullet.material = this.materials[n].pop();
		bullet.velocity = get(Vector3).copy(Axis.z).applyQuaternion(bullet.quaternion).setLength(bullet.v);
		bullet.name = n;
		bullet.scale.multiplyScalar(bullet.size * bulletScale);
		this.scene.threeScene.add(bullet);
		this.elements.push(bullet);
		return bullet;
	}

	hitTest(unit) {
		for (let i = 0; i < this.count; i++) {
			const bullet = this.get(i);
			const radius = unit.hitSphere ? unit.hitSphere : unit.geometry.boundingSphere.radius * unit.scale.x;
			if (unit.position.distanceTo(bullet.position) < radius + bullet.size) {
				this.scene.effectManager.hit(bullet.position, bullet.size, 10);
				unit.dispatchEvent({type: 'hitByBullet', source: bullet});
				unit.hp -= bullet.atk / unit.armor;
				if (!bullet.pierce) {
					this.remove(i);
					i--;
				}
			}
		}
	}

	remove(i) {
		const bullet = this.get(i);
		bullet.parent.remove(bullet);
		if (bullet.ownMaterial) this.materials[bullet.name].push(bullet.material);
		free(bullet.velocity);
		super.remove(i);
	}

	static requiredResources = {GLSL: ['glowFragment', {glowVertex: "data/glsl/glowvertex.min.glsl"}]};
}
