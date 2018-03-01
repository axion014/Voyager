phina.define('BulletManager', {
	superClass: 'SimpleUpdater',

	init: function(s, ts, c) {
		this.superInit();
		this.scene = s;
		this.threescene = ts;
		// Put some variant of model of bullet here
		// maybe laser
		this.models = {
			bullet: phina.asset.AssetManager.get('threejson', 'bullet').data,
			laser: new THREE.Mesh(new THREE.SphereGeometry(4, 16, 16), new THREE.ShaderMaterial({
        uniforms: {
          c: {type: "f", value: 0},
          p: {type: "f", value: 3},
          glowColor: {type: "c", value: new THREE.Color(0xffff00)}
        },
        vertexShader: phina.asset.AssetManager.get('text', 'glowvertexshader').data,
        fragmentShader: phina.asset.AssetManager.get('text', 'glowfragshader').data,
				side: THREE.FrontSide,
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
	},

	createBullet: function(n, r, k) {
		if (k === undefined) k = this.cloneMaterial;
		var bullet = this.models[n].deepclone(false, k && this.materials[n].length === 0);
		if (k && this.materials[n].length !== 0) bullet.material = this.materials[n].pop();
		THREE.$extend(bullet, r).$safe({
			v: 1, size: 1, atk: 1, ownMaterial: k,
			update: function() {
				this.position.add(this.velocity);
			}
		});
		bullet.velocity = Axis.z.clone().applyQuaternion(bullet.quaternion).setLength(bullet.v);
		bullet.name = n;
		bullet.scale.multiplyScalar(bullet.size * 2);
		this.threescene.add(bullet);
		this.elements.push(bullet);
		return bullet;
	},

	hitTest: function(unit) {
		this.each(function(bullet, j) {
			if (unit.position.clone().sub(bullet.position).length() < unit.geometry.boundingSphere.radius * unit.scale.x + bullet.size) {
				unit.summons.effectManager.explode(bullet.position, 1, 10);
				//effectManager.explode(this.allyBulletManager.get(j).position, this.allyBulletManager.get(j).size, 10);
				unit.hp -= bullet.atk * this.scene.difficulty / unit.armor;
				if (!bullet.pierce) this.removeBullet(j);
			}
		}, this);
	},

	update: function() {this.each(function(bullet) {bullet.update();});},

	removeBullet: function(i) {
		var bullet = this.get(i);
		bullet.parent.remove(bullet);
		if (bullet.ownMaterial) this.materials[bullet.name].push(bullet.material);
		this.remove(i);
	}
});
