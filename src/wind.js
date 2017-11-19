phina.define('fly.WindManager', {
	superClass: 'fly.SimpleUpdater',

	time: 0, flyerposy: 0,

	init: function(ts) {
		this.superInit();
		this.threescene = ts;
	},

	createWind: function(r, c) {
		var wind = {
			v: 0.2, size: 100,
			position: new THREE.Vector2(),
			winds: [], update: function(){}
		}.$extend(r);
		wind.mesh = THREE.$extend(new THREE.Mesh(new THREE.RingGeometry(wind.size - 0.4, wind.size, 50, 5), new THREE.MeshBasicMaterial({
			color: c, side: THREE.DoubleSide
		})), {position: new THREE.Vector3(wind.position.x, 0, wind.position.y)});
		for (var i = -10000 * Math.sign(wind.v); Math.abs(i) <= 10000; i += wind.v * 300) {
			wind.winds.push(wind.mesh.clone());
			wind.winds.last.rotate(Math.PI / 2, 0, 0);
			wind.winds.last.position.y = this.flyerposy + i;
			this.threescene.add(wind.winds.last);
		}
		this.elements.push(wind);
		return wind;
	},

	update: function() {
		this.each(function(wind) {
			if (this.time % 30 === 0) {
				wind.winds.push(wind.mesh.clone());
				wind.winds.last.rotate(Math.PI / 2, 0, 0);
				wind.winds.last.position.y = this.flyerposy - 10000 * Math.sign(wind.v);
				this.threescene.add(wind.winds.last);
			}
			if (wind.winds.first && wind.winds.first.parent && Math.abs(wind.winds.first.position.y - this.flyerposy) > 10000) {
				wind.winds.first.parent.remove(wind.winds.first);
			}
			for (var i = 0; i < wind.winds.length; i++) {
				wind.winds[i].position.y += wind.v * 10;
			}
		});
		this.time++;
	},

	removeWind: function(i) {
		this.get(i).winds.each(function(wind) {wind.parent.remove(wind);});
		this.remove(i);
	}
});
