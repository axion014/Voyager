phina.define('fly.BulletManager', {
	superClass: 'fly.SimpleUpdater',

	init: function(ts) {
		this.superInit();
		this.threescene = ts;
		this.bullet = phina.asset.AssetManager.get('threejson', 'bullet');
	},

	createBullet: function(r) {
		var bullet = this.bullet.get(false, true);
		THREE.$extend(bullet, r).$safe({
			v: 1, size: 1, atk: 1,
			update: function(){
				this.position.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.v);
			}
		});
		bullet.scale.setScalar(bullet.size * 2);
		this.threescene.add(bullet);
		this.elements.push(bullet);
		return bullet;
	},

	update: function() {this.each(function(bullet) {bullet.update();});},

	removeBullet: function(i) {
		this.get(i).parent.remove(this.get(i));
		THREE.applyToAllMaterial(this.get(i).material, function(m) {m.dispose();});
		this.remove(i);
	}
});
