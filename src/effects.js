import {
	Mesh,
	IcosahedronGeometry, SphereGeometry, CylinderGeometry,
	ShaderMaterial, MeshBasicMaterial,
	Quaternion, Color,
	FrontSide
} from "three";

import ElementManager from "./elementmanager";

export default class EffectManager extends ElementManager {

	constructor(ts) {
		super();
		this.hitEffectManager = HitEffectManager(ts);
		this.explodeManager = ExplodeManager(ts);
		this.rayManager = RayManager(ts);
	}

	update() {
		this.hitEffectManager.update();
		this.explodeManager.update();
		this.rayManager.update();
	}

	hit(p, s, t) {return this.hitEffectManager.generate(p, s, t);}
	explode(p, s, t) {return this.explodeManager.explode(p, s, t);}
	ray(g, c, o, w, mw, t) {return this.rayManager.ray(g, c, o, w, mw, t);}
}

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
				random: {type: "f", value: 100 * Math.random()},
				c: {type: "f", value: 0},
				p: {type: "f", value: 3},
				glowColor: {type: "c", value: new Color(0xffff00)},
				opacity: {type: "f", value: 1}
			},
			vertexShader: phina.asset.AssetManager.get('text', 'noisyglowvertexshader').data,
			fragmentShader: phina.asset.AssetManager.get('text', 'glowfragshader').data
		});
		const mesh = new Mesh(new IcosahedronGeometry(20, 2), material).$safe({
			time: t, timeMax: t
		}).$safe({
			time: 10, timeMax: 10,
			update() {
				this.time--;
				material.opacity = this.time / this.timeMax;
				material.uniforms.opacity.value = material.opacity;
			}
		});
		mesh.move(p);
		mesh.scale.set(s, s, s);
		this.threescene.add(mesh);
		this.elements.push(mesh);
		return mesh;
	}

	update() {
		for (let i = 0; i < this.count; i++) {
			this.get(i).update();
			if (this.get(i).time === 0) {
				this.get(i).parent.remove(this.get(i));
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
				tExplosion: {type: "t", value: phina.asset.AssetManager.get('threetexture', 'explode').get()},
				random: {type: "f", value: 100 * Math.random()},
				time: {type: "f", value: 0},
				opacity: {type: "f", value: 1}
			},
			vertexShader: phina.asset.AssetManager.get('text', 'expvertexshader').data,
			fragmentShader: phina.asset.AssetManager.get('text', 'expfragshader').data
		});
		const mesh = new Mesh(new IcosahedronGeometry(20, 2), material).$safe({
			time: t, timeMax: t
		}).$safe({
			time: 10, timeMax: 10,
			update() {
				this.time--;
				material.uniforms.time.value += 0.0025;
				material.opacity = this.time / this.timeMax;
				material.uniforms.opacity.value = material.opacity;
			}
		});
		mesh.move(p);
		mesh.scale.set(s, s, s);
		this.threescene.add(mesh);
		this.elements.push(mesh);
		return mesh;
	}

	update() {
		for (let i = 0; i < this.count; i++) {
			this.get(i).update();
			if (this.get(i).time === 0) {
				this.get(i).parent.remove(this.get(i));
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
				update() {
					this.time--;
					if (this.time === 0) {
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
			this.elements.push(ray);
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
			update() {
				this.time++;

				const scale = rays.radiusfunc(this.time, this.timeMax);
				this.forEach(ray => {
					if (this.time === this.timeMax) {
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
				if (this.time === this.timeMax) self.elements.erase(this);
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

		this.elements.push(rays);
		return rays;
	}
}
