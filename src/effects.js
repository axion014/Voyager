phina.define('fly.EffectManager', {
	superClass: 'fly.SimpleUpdater',

	init: function(ts) {
		this.superInit();
		this.explodeManager = fly.ExplodeManager(ts).addChildTo(this);
		this.rayManager = fly.RayManager(ts).addChildTo(this);
		this.threescene = ts;
	},

	explode: function(p, s, t) {return this.explodeManager.explode(p, s, t);},
	ray: function(g, c, o, w, mw, t) {return this.rayManager.ray(g, c, o, w, mw, t);},
});

phina.define('fly.ExplodeManager', {
	superClass: 'fly.SimpleUpdater',

	init: function(ts) {
		this.superInit();
		this.threescene = ts;
	},

	explode: function(p, s, t) {
		var material = new THREE.ShaderMaterial({
			transparent: true,
			uniforms: {
				tExplosion: {type: "t", value: phina.asset.AssetManager.get('threetexture', 'explode').get()},
				time: {type: "f", value: 100 * Math.random()}, alpha: {type: "f", value: 1.0}
			},
			vertexShader: phina.asset.AssetManager.get('text', 'expvertexshader').data,
			fragmentShader: phina.asset.AssetManager.get('text', 'expfragshader').data
		});
		var mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(20, 2), material).$safe({
			time: t, timeMax: t
		}).$safe({
			time: 10, timeMax: 10,
			update: function() {
				this.time--;
				material.uniforms.time.value += 0.015 * Math.random();
				material.uniforms.alpha.value = this.time / this.timeMax;
			}
		});
		mesh.move(p);
		mesh.scale.set(s, s, s);
		this.threescene.add(mesh);
		this.elements.push(mesh);
		return mesh;
	},

	update: function() {
		for (var i = 0; i < this.count(); i++) {
			this.get(i).update();
			if (this.get(i).time === 0) {
				this.get(i).parent.remove(this.get(i));
				this.remove(i);
				i--;
			}
		}
	}
});

phina.define('fly.RayManager', {
	superClass: 'fly.SimpleUpdater',

	init: function(ts) {
		this.superInit();
		this.threescene = ts;
	},

	ray: function(g, a, b, c, d) {
		g.geometry.boundingBox || g.geometry.computeBoundingBox();
		var self = this;
		if (d) {
			var upperSphere = new THREE.Mesh(new THREE.SphereGeometry(c, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2));
			upperSphere.position.y = 500;
			var ray = new THREE.Mesh(
				new THREE.CylinderGeometry(c, c, 1000, 20, 10),
				new THREE.MeshBasicMaterial({color: a, opacity: b, transparent: true})
			).$safe({
				generator: g,
				offset: 500 + c + g.geometry.boundingBox.max.z,
				time: d,
				update: function() {
					this.time--;
					if (this.time === 0) {
						this.parent.remove(this);
						self.elements.erase(this);
						return;
					}
					this.move(this.generator.position.clone().add(Axis.z.clone().applyQuaternion(
							this.generator.quaternion).setLength(this.offset)));
					this.quaternion.copy(new THREE.Quaternion());
					this.rotate(Math.PI / 2, Math.PI);
					this.quaternion.premultiply(this.generator.quaternion);
				}
			});
			ray.geometry.mergeMesh(upperSphere);
			this.threescene.add(ray);
			this.elements.push(ray);
			return ray;
		}
		var data = a;
		var rays = [];
		rays.$safe({
			generator: g,
			offset: 500 + data.reduce(function(a, b) {return a > b.radius ? a : b.radius}, 0) + g.geometry.boundingBox.max.z,
			time: 0,
			timeMax: b,
			radiusfunc: c,
			update: function() {
				this.time++;

				var scale = rays.radiusfunc(this.time, this.timeMax);
				this.each(function(ray) {
					if (this.time === this.timeMax) {
						ray.parent.remove(ray);
						return;
					}
					ray.move(this.generator.position.clone().add(Axis.z.clone().applyQuaternion(
						this.generator.quaternion).setLength(this.offset)));
					ray.quaternion.copy(new THREE.Quaternion());
					ray.rotate(Math.PI / 2, Math.PI);
					ray.quaternion.premultiply(this.generator.quaternion);
					ray.scale.x = ray.scale.z = scale;
				}, this);
				if (this.time === this.timeMax) self.elements.erase(this);
			}
		});
		data.each(function(data) {
			var upperSphere = new THREE.Mesh(new THREE.SphereGeometry(data.radius, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2));
			upperSphere.position.y = 500;
			var ray = new THREE.Mesh(
				new THREE.CylinderGeometry(data.radius, data.radius, 1000, 20, 10),
				new THREE.MeshBasicMaterial({color: data.color, opacity: data.opacity, transparent: true})
			);
			ray.geometry.mergeMesh(upperSphere);
			this.threescene.add(ray);
			rays.push(ray);
		}, this);

		this.elements.push(rays);
		return rays;
	}
});
