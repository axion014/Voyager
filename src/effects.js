import {
	Mesh,
	IcosahedronGeometry, SphereGeometry, CylinderGeometry,
	ShaderMaterial, MeshBasicMaterial,
	Quaternion, Color,
	FrontSide
} from "three";

import ElementManager from "./elementmanager";
import assets from "w3g/loading";

export default class EffectManager extends ElementManager {

	constructor(ts) {
		super();
		this.hitEffectManager = new HitEffectManager(ts);
		this.explodeManager = new ExplodeManager(ts);
		this.rayManager = new RayManager(ts);
	}

	update(delta) {
		this.hitEffectManager.update(delta);
		this.explodeManager.update(delta);
		this.rayManager.update(delta);
	}

	hit(p, s, t) {return this.hitEffectManager.generate(p, s, t);}
	explode(p, s, t) {return this.explodeManager.explode(p, s, t);}
	ray(g, c, o, w, mw, t) {return this.rayManager.ray(g, c, o, w, mw, t);}

	static requiredResources = {
		THREE_Texture: {explode: "data/images/explosion.png"},
		GLSL: [
			'glowFragment',
			{
				noisyGlowVertex: "data/glsl/noisyglowvertex.min.glsl",
				explodeVertex: "data/glsl/expvertex.min.glsl",
				explodeFragment: "data/glsl/expfrag.min.glsl"
			}
		]
	};
}

const icosahedronsphere = new IcosahedronGeometry(20, 2);

class HitEffectManager extends ElementManager {

	constructor(ts) {
		super();
		this.threescene = ts;
	}

	generate(p, s, t) {
		const material = new ShaderMaterial({
			transparent: true,
			side: FrontSide,
			uniforms: {
				random: {value: 100 * Math.random()},
				c: {value: 0},
				p: {value: 3},
				glowColor: {value: new Color(0xffff00)},
				opacity: {value: 1}
			},
			vertexShader: assets.GLSL.noisyGlowVertex,
			fragmentShader: assets.GLSL.glowFragment
		});
		const mesh = Object.assign(new Mesh(icosahedronsphere, material), {
			time: 150, timeMax: 150,
			update(delta) {
				this.time -= delta;
				material.opacity = this.time / this.timeMax;
				material.uniforms.opacity.value = material.opacity;
			}
		}, {time: t, timeMax: t});
		mesh.position.copy(p);
		mesh.scale.setScalar(s);
		this.threescene.add(mesh);
		this.add(mesh);
		return mesh;
	}

	update(delta) {
		for (let i = 0; i < this.count; i++) {
			const element = this.get(i);
			if (element.time <= 0) {
				element.parent.remove(element);
				this.remove(i);
				i--;
			}
		}
	}
}

class ExplodeManager extends ElementManager {

	constructor(ts) {
		super();
		this.threescene = ts;
	}

	explode(p, s, t) {
		const material = new ShaderMaterial({
			transparent: true,
			uniforms: {
				tExplosion: {value: assets.THREE_Texture.explode},
				random: {value: 100 * Math.random()},
				time: {value: 0},
				opacity: {value: 1}
			},
			vertexShader: assets.GLSL.explodeVertex,
			fragmentShader: assets.GLSL.explodeFragment
		});
		const mesh = Object.assign(new Mesh(icosahedronsphere, material), {
			time: 150, timeMax: 150,
			update(delta) {
				this.time -= delta;
				material.uniforms.time.value += 0.0002 * delta;
				material.opacity = this.time / this.timeMax;
				material.uniforms.opacity.value = material.opacity;
			}
		}, {time: t, timeMax: t});
		mesh.position.copy(p);
		mesh.scale.setScalar(s);
		this.threescene.add(mesh);
		this.add(mesh);
		return mesh;
	}

	update(delta) {
		for (let i = 0; i < this.count; i++) {
			const element = this.get(i);
			if (element.time <= 0) {
				element.parent.remove(element);
				this.remove(i);
				i--;
			}
		}
	}
}

class RayManager extends ElementManager {

	constructor(ts) {
		super();
		this.threescene = ts;
	}

	ray(g, a, b, c, d) {
		g.geometry.boundingBox || g.geometry.computeBoundingBox();
		const self = this;
		if (d) {
			const upperSphere = new Mesh(new SphereGeometry(c, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2));
			upperSphere.position.y = 500;
			const ray = new Mesh(
				new CylinderGeometry(c, c, 1000, 20, 10),
				new MeshBasicMaterial({color: a, opacity: b, transparent: true})
			).$safe({
				generator: g,
				offset: 500 + c + g.geometry.boundingBox.max.z,
				time: d,
				update(delta) {
					this.time -= delta;
					if (this.time <= 0) {
						this.parent.remove(this);
						self.elements.erase(this);
						return;
					}
					this.move(this.generator.position.clone().add(Axis.z.clone().applyQuaternion(
							this.generator.quaternion).setLength(this.offset)));
					this.quaternion.set(0, 0, 0, 1);
					this.rotateY(Math.PI);
					this.rotateX(Math.PI / 2);
					this.quaternion.premultiply(this.generator.quaternion);
				}
			});
			ray.geometry.mergeMesh(upperSphere);
			this.threescene.add(ray);
			this.add(ray);
			return ray;
		}
		const data = a;
		const rays = [];
		rays.$safe({
			generator: g,
			offset: 500 + data.reduce((a, b) => a > b.radius ? a : b.radius, 0) + g.geometry.boundingBox.max.z,
			time: 0,
			timeMax: b,
			radiusfunc: c,
			update(delta) {
				this.time += delta;

				const scale = rays.radiusfunc(this.time, this.timeMax);
				this.forEach(ray => {
					if (this.time >= this.timeMax) {
						ray.parent.remove(ray);
						return;
					}
					ray.move(this.generator.position.clone().add(Axis.z.clone().applyQuaternion(
						this.generator.quaternion).setLength(this.offset)));
					ray.quaternion.copy(new Quaternion());
					ray.rotateY(Math.PI);
					ray.rotateX(Math.PI / 2);
					ray.quaternion.premultiply(this.generator.quaternion);
					ray.scale.x = ray.scale.z = scale;
				});
				if (this.time >= this.timeMax) self.remove(self.elements.indexOf(this));
			}
		});
		data.forEach(data => {
			const upperSphere = new Mesh(new SphereGeometry(data.radius, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2));
			upperSphere.position.y = 500;
			const ray = new Mesh(
				new CylinderGeometry(data.radius, data.radius, 1000, 20, 10),
				new MeshBasicMaterial({color: data.color, opacity: data.opacity, transparent: true})
			);
			ray.geometry.mergeMesh(upperSphere);
			this.threescene.add(ray);
			rays.push(ray);
		});

		this.add(rays);
		return rays;
	}
}
