phina.define('MainSequence', {
	superClass: 'phina.game.ManagerScene',
	init: function() {
		this.superInit({
			scenes: [
				{
					className: 'LoadingScene',
					arguments: {
						lie: false,
						assets: {
							threejson: {
								fighter: 'data/models/fighter-1.min.json',
								bullet: 'data/models/bullet-lq.min.json',
								enem1: 'data/models/enem-1.min.json',
								airballoon: 'data/models/airballoon.min.json',
							},
							threetexture: {
								//fighter: 'data/models/fighter-1.png',
								plane: 'data/images/3.png',
								explode: 'data/images/explosion.png'
							},
							text: {
								expvertexshader: 'data/glsl/expvertexshader.glsl',
								expfragshader: 'data/glsl/expfragshader.glsl',
								glowvertexshader: 'data/glsl/glowvertexshader.glsl',
								glowfragshader: 'data/glsl/glowfragshader.glsl'
							}
						}
					}
				},
				{
					label: 'title',
					className: 'TitleScene',
					arguments: {
						width: SCREEN_WIDTH,
						height: SCREEN_HEIGHT
					}
				},
				{
					label: 'main',
					className: 'MainScene',
					arguments: {
						width: SCREEN_WIDTH,
						height: SCREEN_HEIGHT
					}
				}
			]
		});
	}
});

phina.define('Application', {
	superClass: 'phina.display.ThreeApp',
	init: function() {
		this.superInit({
			width: SCREEN_WIDTH,
			height: SCREEN_HEIGHT,
			query: '#game',
			fit: true
		});
		threeext.extention();
		this.replaceScene(MainSequence());
		this.enableStats();
	},
});

phina.main(function() {
	var app = Application();
	app.setupEffect().then(function() {
		app.run();
	});
});
