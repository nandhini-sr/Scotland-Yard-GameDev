var mongojs = require('mongojs');
var db = mongojs('localhost:27017/web_project',['users','teams','paths']);

var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/',function(req,res){
	res.sendFile(__dirname + '/client/game1.html');
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(2000);
console.log("Server started");

	var SOCKET_LIST = {};
	var PLAYER_LIST = {};
	var order = {};
	var SLYG = [];

	class SLYGame
	{
		constructor(teamName,mrX,det1,det2,det3)
		{
			this._teamName = teamName;
			this._players = [mrX,det1,det2,det3];
			this._sockets = [SOCKET_LIST[mrX.id],SOCKET_LIST[det1.id],SOCKET_LIST[det2.id],SOCKET_LIST[det3.id]];
			this.chance = 0;
			
			this.GamePlayBox(this._players,this._teamName);
			this.drawPlayers();
			this.movePawn();
			this.callAlways();
			this.checkAll();
			this.startSay();
			this.teamChat();
			this.giveX();
			this.tracking();
			this.checkIfOver();
			this.tellNoMoves();			
			this.mainGame();
			this.gameOver();
		}

		gameOver()
		{
			var arraySockets = this._sockets;
			this._sockets.forEach((socket)=>{
				socket.on('GOver',function(data){
					arraySockets.forEach((sock)=>{
						sock.emit('openGameOverModal',{
							xwon:data.xwon,
							mrx:data.mrx,
							teamname:data.teamname,
							detec1:data.detec1,
							detec2:data.detec2,
							detec3:data.detec3,
							staplay:data.staplay,
							dd:data.dd,
							xx:data.xx
							});						
						});
					});
				});
		}

		checkIfOver()
		{
			var arraySockets = this._sockets;
			var arrayPlayers = this._players;
			this._sockets.forEach((socket)=>{
				socket.on('checkOver',function(){
					arrayPlayers.forEach((player)=>{
						
						if(player.id == socket.id)
						{
							if(player.numTaxi == 0)
							{
								socket.emit('taxiTicketsOver');
							}
						}
					});
					});
				});
		}

		tellNoMoves()
		{
			var arraySockets = this._sockets;
			var arrayPlayers = this._players;
			var tname = this._teamName;
			this._sockets.forEach((socket)=>{
				socket.on('cantMove',function(){
					var playOver = 0;
					arrayPlayers.forEach((player)=>{
						if(player.id == socket.id)
						{
							player.cantMove = 1;
						}
					});
					socket.emit('closeModal');
					socket.emit('resetPathResponse');
					arrayPlayers.forEach((player)=>{
						
						if(player.id!=arraySockets[0].id)
						{
							if(player.cantMove == 1)
							{
								playOver++;
							}
						}						
					});
					if(playOver >= 3)
					{
						findXWon(tname,function(res){
							var xwon = res;
							xwon++; // because d won			
							db.teams.update({name:tname},{$set:{xwin:xwon}});
							findDWon(tname,function(res){
								var dwon = res;
								findNumPlayed(tname,function(res){
								var straPlan = res;
								findmrX(tname,function(res){
									var x = res;
									find1(tname,function(res){
										var d1 = res;
										find2(tname,function(res){
											var d2 = res;
											find3(tname,function(res){
												var d3 = res;
												socket.emit('GameOver',{
													xwon:true,
													teamname:tname,
													mrx:''+x,
													detec1:''+d1,
													detec2:''+d2,
													detec3:''+d3,
													staplay:''+straPlan,
													dd:''+dwon,
													xx:''+xwon
												});		
											});
										});	
									});
								});	
							});
						});
					});//gameOver
					}
					else
					{
						socket.emit('callNext');
					}
				});
			});			
		}

		startSay()
		{
			var arrayPlayers = this._players;
			this._players.forEach((player)=>{
				var startLocation = [114,108,119,185,174,128,107,199];
				var check = true;
				while(check)
				{
					var startAt = startLocation[Math.floor(Math.random()*startLocation.length)];
					if(arrayPlayers[0].currentLocation == startAt || arrayPlayers[1].currentLocation == startAt || arrayPlayers[2].currentLocation == startAt || arrayPlayers[3].currentLocation == startAt)
					{
						check = true;
					}
					else
					{
						check = false;
					}
				}

				player.currentLocation = startAt;
				player.trackLoc.push(startAt);
			});

			//emit socket0 location to only socket x
			this._sockets[0].emit('revealxTrack',{
					tracked: arrayPlayers[0].trackLoc,
					id:'trackx'
						
			});

			this._sockets.forEach((socket)=>{
							socket.emit('showTrack', {
							tracked: arrayPlayers[1].trackLoc,
							id:'track1'
						});
					});
			this._sockets.forEach((socket)=>{
							socket.emit('showTrack', {
							tracked: arrayPlayers[2].trackLoc,
							id:'track2'
						});
					});
			this._sockets.forEach((socket)=>{
							socket.emit('showTrack', {
							tracked: arrayPlayers[3].trackLoc,
							id:'track3'
						});
					});
		}

		callAlways()
		{
			var arrayPlayers = this._players;
			var arraySockets = this._sockets;

			setInterval(function(){
				var quantum = [];
			
			arrayPlayers.forEach((player)=>{
				player.updatePosition();
				quantum.push({
					x:player.x,
					y:player.y,
					colors:player.color
				});
			});

			arraySockets.forEach((sock)=>{
				sock.emit('newPosition', quantum);
			});

			}, 1000/25);
		}

		checkAll()
		{
			var arrayPlayers = this._players;
			var arraySockets = this._sockets;

			setInterval(function(){

			arraySockets.forEach((sock)=>{
				if(!PLAYER_LIST[sock.id])
				{
					arraySockets.forEach((socket)=>{
					if(socket.id!=sock.id)
					{
						socket.emit('playerLeft');
					}			
					});
				}
								
			});

			}, 1000/25);
		}


		GamePlayBox(people,teamname)
		{
			var arraySockets = this._sockets;
			findXWon(teamname,function(res){
				var xwon = res;
				findDWon(teamname,function(res){
				var dwon = res;
					findNumPlayed(teamname,function(res){
					var straPlan = res;
					arraySockets.forEach((socket)=>{
						socket.emit('updateGamePlay', {
								team:teamname,
								mrX:people[0].playername,
								det1:people[1].playername,
								det2:people[2].playername,
								det3:people[3].playername,
								staplay:straPlan,
								dwin:dwon,
								xwin:xwon
							});
						});
					});
				});
			});
		}

		giveX()
		{
			var giveX = this._players[0];
			var arraySockets = this._sockets;

			this._sockets.forEach((socket)=>{
				socket.on('giveToX',function(data){
					
					if(socket.id != giveX.id)
					{
						if(data.what == 'taxi')
						{
							giveX.numTaxi++;
						}
						else if(data.what == 'bus')
						{
							giveX.numBus++;
						}
						else if(data.what == 'underground')
						{
							giveX.numUG++;
						}
					}
	
					arraySockets.forEach((sock)=>{
							sock.emit('countTicket', {
								taxiN:PLAYER_LIST[sock.id].numTaxi,
								busN:PLAYER_LIST[sock.id].numBus,
								ugN:PLAYER_LIST[sock.id].numUG,
								blackN:PLAYER_LIST[sock.id].numBlack
							});
						});
					});
				});					
		}

		tracking()
		{
			var arraySockets = this._sockets;
			var arrayPlayers = this._players;
			this._sockets.forEach((socket)=>{
				socket.on('updateTrack',function(data){
					console.log('updateTrack call');
					socket.emit('movement',{
						moves:PLAYER_LIST[socket.id].numMoves,
						id:'movement'
					});
					if(data.who == arraySockets[0].id)
					{
						var movesX = arrayPlayers[0].numMoves;
						arrayPlayers[0].trackLoc.push(data.mode);
						arrayPlayers[0].trackLoc.push(data.to);
						
						console.log(arrayPlayers[0].trackLoc);
						if(movesX == 3 || movesX == 7 || movesX == 11 || movesX == 15)
						{
							arraySockets.forEach((sock)=>{
							sock.emit('revealxTrack', {
							tracked: arrayPlayers[0].trackLoc,
							id:'trackx'
							});
							});
						}

						else
						{
							arraySockets.forEach((sock)=>{
							sock.emit('hidexTrack', {
							mode:data.mode,
							id:'trackx'
							});
							});
						}
												
					}
					else if(data.who == arraySockets[1].id)
					{
						console.log('numMoves1'+arrayPlayers[1].numMoves);
						arrayPlayers[1].trackLoc.push(data.mode);
						arrayPlayers[1].trackLoc.push(data.to);
						arraySockets.forEach((sock)=>{
							sock.emit('showTrack', {
							tracked: arrayPlayers[1].trackLoc,
							id:'track1'
						});
						});
					
					}
					else if(data.who == arraySockets[2].id)
					{
						console.log('numMoves2'+arrayPlayers[2].numMoves);
						arrayPlayers[2].trackLoc.push(data.mode);
						arrayPlayers[2].trackLoc.push(data.to);
						arraySockets.forEach((sock)=>{
							sock.emit('showTrack', {
							tracked: arrayPlayers[2].trackLoc,
							id:'track2'
						});
						});
						
					}
					else if(data.who == arraySockets[3].id)
					{
						console.log('numMoves3'+arrayPlayers[3].numMoves);
						arrayPlayers[3].trackLoc.push(data.mode);
						arrayPlayers[3].trackLoc.push(data.to);
						arraySockets.forEach((sock)=>{
							sock.emit('showTrack', {
							tracked: arrayPlayers[3].trackLoc,
							id:'track3'
						});
						});
						
					}
					
					});
				});
		}

		sendToPlayers(message)
		{
			this._sockets.forEach((socket)=>{
				socket.emit('tellPlayers', {
						msg: message,
						id:'tell'
					});
			});
		}

		teamChat()
		{
			var arraySockets = this._sockets;
			this._sockets.forEach((socket)=>{
				socket.on('sendMsgToServer',function(data){
					arraySockets.forEach((sock)=>{
							sock.emit('addToChat', {
								user:PLAYER_LIST[socket.id].playername,
								send:data,
								turn:PLAYER_LIST[socket.id].turn
							});
						});
					});
				});
		}

		drawPlayers()
		{
			var quantum = [];
			this._players.forEach((player)=>{
				player.updatePosition();
				quantum.push({
					x:player.x,
					y:player.y,
					colors:player.color
				});
			});

			this._sockets.forEach((socket)=>{
				socket.emit('drawPlayers', quantum);
			});

		}

		movePawn()
		{
			this._sockets.forEach((socket)=>{
				socket.on('keyPress',function(data){
				player = PLAYER_LIST[socket.id];
					if(data.inputId == 'left')
					{
						player.pressingLeft = data.state;		
					}					
					else if(data.inputId == 'right')
					{
						player.pressingRight = data.state;
					}
					else if(data.inputId == 'up')
					{
						player.pressingUp = data.state;
					}
					else if(data.inputId == 'down')
					{
						player.pressingDown = data.state;
					}
		
				});
			});
		}

		mainGame()
		{
			this.chance ++;
			var chanceNum = this.chance;
			var tname = this._teamName;
			this.sendToPlayers("Mr X 's turn...");

			var arraySockets = this._sockets;
			var arrayPlayers = this._players;

			arraySockets[0].emit('modalToggle',{
								toggle:true
							});
			console.log('chance '+ chanceNum);
			this._sockets.forEach((socket)=>{
				socket.on('passNextPlayer',function(data){
					console.log('passnext call');
					chanceNum++;
					console.log('chance '+ chanceNum);
					if(chanceNum == 61)//61
					{
						findXWon(tname,function(res){
							var xwon = res;
							xwon++; // because d won			
							db.teams.update({name:tname},{$set:{xwin:xwon}});
							findDWon(tname,function(res){
								var dwon = res;
								findNumPlayed(tname,function(res){
								var straPlan = res;
								findmrX(tname,function(res){
									var x = res;
									find1(tname,function(res){
										var d1 = res;
										find2(tname,function(res){
											var d2 = res;
											find3(tname,function(res){
												var d3 = res;
												socket.emit('GameOver',{
													xwon:true,
													teamname:tname,
													mrx:''+x,
													detec1:''+d1,
													detec2:''+d2,
													detec3:''+d3,
													staplay:''+straPlan,
													dd:''+dwon,
													xx:''+xwon
												});		
											});
										});	
									});
								});	
							});
						});
					});
							
					}

					else
					{
						if(!(chanceNum%4))
						{
							arraySockets.forEach((sock)=>{
								sock.emit('tellPlayers', {
									msg: "Detective 3 's turn..."
								});
								sock.emit('modalToggle',{
									toggle:false
								});
							});
							//activate the toggle for the same player
							arraySockets[3].emit('modalToggle',{
									toggle:true
								});
										
						}
						else if(!((chanceNum+1)%4))
						{
							
							arraySockets.forEach((sock)=>{
								sock.emit('tellPlayers', {
									msg: "Detective 2 's turn..."
								});
								sock.emit('modalToggle',{
									toggle:false
								});
							});

							arraySockets[2].emit('modalToggle',{
									toggle:true
								});
													
						}
						else if(!((chanceNum+2)%4))
						{
							
							arraySockets.forEach((sock)=>{
								sock.emit('tellPlayers', {
									msg: "Detective 1 's turn..."
								});
								sock.emit('modalToggle',{
									toggle:false
								});
							});

							arraySockets[1].emit('modalToggle',{
									toggle:true
								});
						}
						else if(!((chanceNum+3)%4))
						{
							
							arraySockets.forEach((sock)=>{
								sock.emit('tellPlayers', {
									msg: "Mr X 's turn..."
								});
								sock.emit('modalToggle',{
									toggle:false
								});
							});

							arraySockets[0].emit('modalToggle',{
									toggle:true
								});
						}
					}						
				});
			});

		}

		
	}
	
	class Detective
	{
		constructor(id,playername,teamname,color,turn)
		{
			this.id = id;
			this.playername = playername;
			this.color = color;
			this.turn = turn;
			this.teamname = teamname;
			this.x = 25*Math.floor(10*Math.random());
			this.y = 25*Math.floor(10*Math.random());
			this.pressingRight = false;
			this.pressingLeft = false;
			this.pressingUp = false;
			this.pressingDown = false;
			this.mxSpd = 5;
			this.numTaxi = 8;
			this.numBus = 5;
			this.numUG = 2;
			this.numBlack = 0;
			this.numMoves = 0;
			this.currentLocation = 0;
			this.cantMove = 0;
			this.trackLoc = [];
		}

		updatePosition()
		{
			if(this.pressingRight)
				this.x = this.x + this.mxSpd;
			if(this.pressingLeft)
				this.x = this.x - this.mxSpd;
			if(this.pressingUp)
				this.y = this.y - this.mxSpd;
			if(this.pressingDown)
				this.y = this.y + this.mxSpd;
		}
	}

	class MrX
	{
		constructor(id,playername,teamname,color,turn)
		{
			this.id = id;
			this.playername = playername;
			this.color = color;
			this.turn = turn;
			this.teamname = teamname;
			this.x = 100;
			this.y = 100;
			this.pressingRight = false;
			this.pressingLeft = false;
			this.pressingUp = false;
			this.pressingDown = false;
			this.mxSpd = 5;
			this.numTaxi = 3;
			this.numBus = 2;
			this.numUG = 2;
			this.numBlack = 2;
			this.numMoves = 0;
			this.currentLocation = 0;
			this.cantMove = 0;
			this.trackLoc = [];
		}

		updatePosition()
		{
			if(this.pressingRight)
				this.x = this.x + this.mxSpd;
			if(this.pressingLeft)
				this.x = this.x - this.mxSpd;
			if(this.pressingUp)
				this.y = this.y - this.mxSpd;
			if(this.pressingDown)
				this.y = this.y + this.mxSpd;
		}
	}

	function connectPlayer(socket,playerName,role,teamName)
	{
		socket.emit('goToGame');
		var id = socket.id;
		var noteName = true;
		for(var i in PLAYER_LIST)
			{
				if(PLAYER_LIST[i].playername == playerName)
				{
					var noteName = false;
					socket.emit('tellPlayers',{
						msg:'You are already in a game session! Log out to play here...',
					});
				}
			}
		if(noteName == true)
		{
			if(role == 1)
			{
				pawnColor = 'rgba(256,256,256,0.8)';
				player = new MrX(id,playerName,teamName,pawnColor,role);
				PLAYER_LIST[id] = player;
				socket.emit('countTicket',{
					taxiN:PLAYER_LIST[id].numTaxi,
					busN:PLAYER_LIST[id].numBus,
					ugN:PLAYER_LIST[id].numUG,
					blackN:PLAYER_LIST[id].numBlack
				});
				console.log('Mr X added');
			}
			else if(role == 2)
			{
				pawnColor = '#dc3545';
				player = new Detective(id,playerName,teamName,pawnColor,role);
				PLAYER_LIST[id] = player;
				socket.emit('countTicket',{
					taxiN:PLAYER_LIST[id].numTaxi,
					busN:PLAYER_LIST[id].numBus,
					ugN:PLAYER_LIST[id].numUG,
					blackN:PLAYER_LIST[id].numBlack
				});
				console.log('Det1 added');
			}
			else if(role == 3)
			{
				pawnColor = '#00bcd4';
				player = new Detective(id,playerName,teamName,pawnColor,role);
				PLAYER_LIST[id] = player;
				socket.emit('countTicket',{
					taxiN:PLAYER_LIST[id].numTaxi,
					busN:PLAYER_LIST[id].numBus,
					ugN:PLAYER_LIST[id].numUG,
					blackN:PLAYER_LIST[id].numBlack
				});
				console.log('Det2 added');
			}
			else if(role == 4)
			{
				pawnColor = '#ffc107';
				player = new Detective(id,playerName,teamName,pawnColor,role);
				PLAYER_LIST[id] = player;
				socket.emit('countTicket',{
					taxiN:PLAYER_LIST[id].numTaxi,
					busN:PLAYER_LIST[id].numBus,
					ugN:PLAYER_LIST[id].numUG,
					blackN:PLAYER_LIST[id].numBlack
				});
				console.log('Det3 added');
			}

			var countPlayersinTeam = 0;
			for(var i in PLAYER_LIST)
			{
				if(PLAYER_LIST[i].teamname == teamName)
				{
					countPlayersinTeam ++;
				}
			}

			if(countPlayersinTeam<4)
			{
					socket.emit('informPlayers');
					socket.emit('tellPlayers',{
						msg:'Your game session is ready!',
					});
			}
			else
			{
				for(var i in PLAYER_LIST)
				{
					if(PLAYER_LIST[i].teamname == teamName)
					{
						order[0] = teamName;
						//SOCKET_LIST[i].emit('gameBegins');
						if(PLAYER_LIST[i].turn == 1)
						{
							order[1] = PLAYER_LIST[i];
						}
						else if(PLAYER_LIST[i].turn == 2)
						{
							order[2] = PLAYER_LIST[i];
						}
						else if(PLAYER_LIST[i].turn == 3)
						{
							order[3] = PLAYER_LIST[i];
						}
						else if(PLAYER_LIST[i].turn == 4)
						{
							order[4] = PLAYER_LIST[i];
						}

					}
				}
				
				console.log(order[0]);
				console.log(order[1].playername);
				console.log(order[2].playername);
				console.log(order[3].playername);
				console.log(order[4].playername);

				//update the numberPlayed
				findNumPlayed(order[0],function(res){
					var straPlan = res;
					straPlan++;
					db.teams.update({name:order[0]},{$set:{nplayed:straPlan}});
				});			

				SLYG.push(new SLYGame(order[0],order[1],order[2],order[3],order[4]));	


			}
		}
				
	}

	function disconnectPlayer(socket)
	{
		var id = socket.id;
		delete PLAYER_LIST[id];
	}

	var io = require('socket.io')(serv,{});
	io.sockets.on('connection',function(socket){
	socket.id = Math.random(); //give each player an unique ID
	
	SOCKET_LIST[socket.id] = socket;
	console.log('socket connection');
	console.log(socket.id);
	
	socket.on('checkPath',function(data){
		var proceed = 1;
		if(!data.from || !data.to || !data.using)
		{
			socket.emit('pathResponse', {
			msg:"Please fill all the fields!",
			id:'modeCheck'
			});
		}
		else
		{
			if(PLAYER_LIST[socket.id].currentLocation == data.from)
			{
				routethere(data,function(res){
				if(res)
				{
					travelthere(data,function(res){
						if(res)
						{							
							var tname = PLAYER_LIST[socket.id].teamname;
							for(var i in PLAYER_LIST)
							{
								
								if(PLAYER_LIST[i].teamname == tname)
								{
									if(PLAYER_LIST[i].currentLocation == data.to)
									{
										if(PLAYER_LIST[i].turn == 1)
										{
											proceed = 0;
											
											console.log('gameOver');
											socket.emit('closeModal');
											
								findDWon(tname,function(res){
									var dwon = res;
									dwon++; // because d won			
									db.teams.update({name:tname},{$set:{dwin:dwon}});
									findXWon(tname,function(res){
										var xwon = res;
										findNumPlayed(tname,function(res){
											var straPlan = res;
											findmrX(tname,function(res){
												var x = res;
												find1(tname,function(res){
													var d1 = res;
													find2(tname,function(res){
														var d2 = res;
														find3(tname,function(res){
															var d3 = res;
															socket.emit('GameOver',{
																xwon:false,
																teamname:tname,
																mrx:''+x,
																detec1:''+d1,
																detec2:''+d2,
																detec3:''+d3,
																staplay:''+straPlan,
																dd:''+dwon,
																xx:''+xwon
															});		
														});
													});	
												});
											});
										});	
									});
								});
																
							}

										else
										{
											proceed = 0;
											socket.emit('pathResponse', {
											msg:"Another detective there at " + data.to,
											id:'toCheck'
											});
										}
									}	
								}								
							}

								if(proceed)
								{
									if(data.using == 'taxi')
									{
										
										if(PLAYER_LIST[socket.id].numTaxi > 0)
										{
											PLAYER_LIST[socket.id].numTaxi = PLAYER_LIST[socket.id].numTaxi - 1;
											PLAYER_LIST[socket.id].currentLocation = data.to;
											PLAYER_LIST[socket.id].numMoves = PLAYER_LIST[socket.id].numMoves + 1;

											socket.emit('closeModal');
											socket.emit('resetPathResponse');
											socket.emit('ticketToX',{
												ticket:'taxi'
											});
											socket.emit('addTrack',{
												mode:data.using,
												to:data.to,
												who:socket.id
											});
											socket.emit('callNext');
												
										}

										else
										{
											socket.emit('pathResponse', {
											msg:"No taxi tickets left!",
											id:'modeCheck'
											});
										}
									}
								
									else if(data.using == 'bus')
									{
										
										if(PLAYER_LIST[socket.id].numBus > 0)
										{
											PLAYER_LIST[socket.id].numBus = PLAYER_LIST[socket.id].numBus - 1;
											PLAYER_LIST[socket.id].currentLocation = data.to;
											PLAYER_LIST[socket.id].numMoves = PLAYER_LIST[socket.id].numMoves + 1;
											
											
											socket.emit('closeModal');
											socket.emit('resetPathResponse');
											socket.emit('ticketToX',{
												ticket:'bus'
											});
											socket.emit('addTrack',{
												mode:data.using,
												to:data.to,
												who:socket.id
											});
											socket.emit('callNext');
										}

										else
										{
											socket.emit('pathResponse', {
											msg:"No bus tickets left!",
											id:'modeCheck'
											});
										}
									}

									else if(data.using == 'underground')
									{
										if(PLAYER_LIST[socket.id].numUG > 0)
										{
											
											PLAYER_LIST[socket.id].numUG = PLAYER_LIST[socket.id].numUG - 1;
											PLAYER_LIST[socket.id].currentLocation = data.to;
											PLAYER_LIST[socket.id].numMoves = PLAYER_LIST[socket.id].numMoves + 1;

																																	
											socket.emit('closeModal');
											socket.emit('resetPathResponse');
											socket.emit('ticketToX',{
												ticket:'underground'
											});
											socket.emit('addTrack',{
												mode:data.using,
												to:data.to,
												who:socket.id
											});
											socket.emit('callNext');
											
										}

										else
										{
											socket.emit('pathResponse', {
											msg:"No underground tickets left!",
											id:'modeCheck'
											});
										}
									}

									else if(data.using == 'blackTicket')
									{
										if(PLAYER_LIST[socket.id].numBlack > 0)
										{
											PLAYER_LIST[socket.id].numBlack = PLAYER_LIST[socket.id].numBlack - 1;
											PLAYER_LIST[socket.id].currentLocation = data.to;
											PLAYER_LIST[socket.id].numMoves = PLAYER_LIST[socket.id].numMoves + 1;
											
											
											socket.emit('closeModal');
											socket.emit('resetPathResponse');
											socket.emit('ticketToX',{
												ticket:'blackTicket'
											});
											socket.emit('addTrack',{
												mode:data.using,
												to:data.to,
												who:socket.id
											});
											socket.emit('callNext');
											
										}
										else
										{
											socket.emit('pathResponse', {
											msg:"No black tickets left!",
											id:'modeCheck'
											});
										}
									}
								}
						}
						else
						{
							socket.emit('pathResponse', {
							msg:"Check mode of transport again!",
							id:'modeCheck'
							});
						}
					});
				}
				else
				{
					socket.emit('pathResponse', {
					msg:"There is no route from " + data.from + " to " + data.to,
					id:'toCheck'
					});
				}
				});
			}
			else
			{
				socket.emit('pathResponse', {
				msg:"Enter your current Location: " + PLAYER_LIST[socket.id].currentLocation,
				id:'fromCheck'
				});
			}
		}
	});
	
	socket.on('enterGame',function(data){
		if(!data.username || !data.userpassword || !data.teamname || !data.teampassword)
		{
			socket.emit('enterResponse', {
			msg:"Please fill all the fields!",
			id:'tuexist'
			});
		}
		else
		{
			userthere(data.username,function(res){
			if(res)
			{
				userpasswordCheck(data,function(res){
				if(res)
				{
					teamthere(data.teamname,function(res){
					if(res)
					{
						teampasswordCheck(data,function(res){
						if(res)
						{
							teamUserCheck(data,function(res)
							{
								if(res)
								{
									findRole(data,function(res)
									{
										connectPlayer(socket,data.username,res,data.teamname);								
									});
								}
								else
								{
									socket.emit('enterResponse', {
									msg: data.username + ' does not belong to team ' + data.teamname +'! Join Team again!',
									id:'tuexist'
									});
								}
							});
						}
						else
						{
							socket.emit('enterResponse', {
								msg:'Enter correct team_password',
								id:'tpmatch'
								});
						}
						});
					}
					else
					{
						socket.emit('enterResponse', {
							msg:'Seems like team ' + data.teamname + ' is not created! Create again!',
							id:'teamexist'
							});
					}
					});
				}
				else
				{
					socket.emit('enterResponse', {
						msg:'Enter correct user_password',
						id:'upmatch'
						});
				}
				});
			}
			else
			{
				socket.emit('enterResponse', {
					msg:'Seems like ' + data.username + ' is not ready! Sign up again!',
					id:'userexist'
					});
			}
			});
		}
	});

	socket.on('createTeam',function(data){
    if(!data.team_name || !data.team_password || !data.team_ctp || !data.xun || !data.d1un || !data.d2un || !data.d3un)
	{
		socket.emit('teamResponse', {
			msg:"Please fill all the fields!",
			id:'commonMsg'
			});
	}
	else
	{
		var letters = /^[A-Za-z]+$/;
		if(data.team_name.match(letters))
		{
			teamthere(data.team_name,function(res){
			if(res)
			{
				socket.emit('teamResponse', {
					msg:'Teamname taken',
					id:'teamtakenCheck'
				});
			}

			else
			{
				if(data.team_password === data.team_ctp)
				{
					var members = [data.xun,data.d1un,data.d2un,data.d3un];
					var check = 1;
					var count = 0;
					var index = 10;
					 for (var i = 0; i < members.length; i++)
					 {
					 	for(var j=i+1; j<members.length; j++)
					 	{
					 		if(members[i] == members[j])
					 		{
					 			socket.emit('teamResponse', {
								msg:"Same player can't play different roles",
								id:'commonMsg'
								});
					 			check = 0;
					 		}
					 	}
				     
				     }

				     if(check)
				     {
				     	userthere(data.xun,function(res){
						if(res)
						{
							userthere(data.d1un,function(res){
							if(res)
							{
								userthere(data.d2un,function(res){
								if(res)
								{
									userthere(data.d3un,function(res){
									if(res)
									{
										addTeam(data,function(){
										socket.emit('teamResponse',{
											msg:'Your team is created! Play now!',
											id:'teamSuccess'
											});
										});
									}
									else
									{
										socket.emit('teamResponse', {
											msg:'Seems like ' + data.d3un + ' is not ready! Sign up again!',
											id:'commonMsg'
											});
									}
									});
								}
								else
								{
									socket.emit('teamResponse', {
										msg:'Seems like ' + data.d2un + ' is not ready! Sign up again!',
										id:'commonMsg'
										});
								}
								});
							}
							else
							{
								socket.emit('teamResponse', {
									msg:'Seems like ' + data.d1un + ' is not ready! Sign up again!',
									id:'commonMsg'
									});
							}
							});
						}
						else
						{
							socket.emit('teamResponse', {
								msg:'Seems like ' + data.xun + ' is not ready! Sign up again!',
								id:'commonMsg'
								});
						}
						});
				     	
				     }  												
						
				     }

				else
				{
					socket.emit('teamResponse', {
					msg:'Confirm password error',
					id:'teampasswordCheck'
					});
				}
			}
		});
		}
		else
		{
			socket.emit('teamResponse', {
			msg:'Enter valid team_name',
			id:'teamCheck'
			});
		}		
	}	
	});

	socket.on('createUser',function(data){
	if(!data.user_name || !data.user_password || !data.confirm_up)
	{
		socket.emit('userResponse', {
			msg:"Please fill all the fields!",
			id:'passwordCheck'
			});
	}

	else
	{

		var letters = /^[A-Za-z]+$/;
   		if(data.user_name.match(letters))
   		{
   			userthere(data.user_name,function(res){
			if(res)
			{
				socket.emit('userResponse', {
					msg:'Username taken',
					id:'takenCheck'
				});
			}

			else
			{
				if(data.user_password === data.confirm_up)
				{
					addUser(data,function(){
					socket.emit('userResponse',{
						msg:'Sign Up success! Join a team to play!',
						id:'readySuccess'
					});
					});
				}

				else
				{
					socket.emit('userResponse', {
					msg:'Confirm password error',
					id:'passwordCheck'
					});
				}
				
			}
			});
   		}

   		else
   		{
   			socket.emit('userResponse', {
			msg:'Enter valid user_name',
			id:'userCheck'
			});
   		}
   	}
	});

		
	socket.on('disconnect',function(){
		delete SOCKET_LIST[socket.id];
		disconnectPlayer(socket);
	});
});

		
    function addUser(data,cb)
	{
		db.users.insert({username:data.user_name,password:data.user_password},function(err)
		{
			cb();
		},10);
	}


    function addTeam(data,cb)
	{
		db.teams.insert({name:data.team_name,password:data.team_password,MrX:data.xun,det1:data.d1un,det2:data.d2un,det3:data.d3un,nplayed:"0",xwin:"0",dwin:"0"},function(err)
		{
			cb();
		},10);
	}

	function userthere(un,cb)
	{
		db.users.find({username:un},function(err,res)
		{
			if(res.length>0) 
			{				
				cb(true);
			}
			else
				cb(false);
		},10);

	}

	function teamthere(tn,cb)
	{
		db.teams.find({name:tn},function(err,res)
		{
			if(res.length>0) 
				cb(true);
			else
				cb(false);
		},10);
	}

	function userpasswordCheck(data,cb)
	{
	
	db.users.find({username:data.username,password:data.userpassword},function(err,res)
	{
		if(res.length>0) 
			cb(true);
		else
			cb(false);
	},10);
	}

	function teampasswordCheck(data,cb)
	{
	
	db.teams.find({name:data.teamname,password:data.teampassword},function(err,res)
	{
		if(res.length>0) 
			cb(true);
		else
			cb(false);
	},10);
	}

	function teamUserCheck(data,cb)
	{
		db.teams.find({
		$and:
		[{name:data.teamname},{
		$or:[{MrX:data.username},
		{det1:data.username},
		{det2:data.username},
		{det3:data.username}]
		}]
		},function(err,res){
			if(res.length>0) 
			cb(true);
			else
			cb(false);
		},10);
	}

	function findRole(data,cb)
	{
		db.teams.find({name:data.teamname,MrX:data.username},function(err,res)
		{
			if(res.length>0) 
				cb(1);
			else
			{
				db.teams.find({name:data.teamname,det1:data.username},function(err,res)
				{
					if(res.length>0) 
						cb(2);
					else
					{
						db.teams.find({name:data.teamname,det2:data.username},function(err,res)
						{
							if(res.length>0) 
								cb(3);
							else
							{
								db.teams.find({name:data.teamname,det3:data.username},function(err,res)
								{
									if(res.length>0) 
										cb(4);
									else
									{
										cb(0);
									}
								},10);
							}
						},10);
					}
				},10);
			}
		},10);
	}

	
	function routethere(data,cb)
	{
		
		db.paths.find({$or:[{from:data.from,to:data.to},{from:data.to,to:data.from}]},function(err,res)
		{

			if(res.length>0) 
				cb(true);
			else
				cb(false);
		},10);
	}

	function travelthere(data,cb)
	{
		db.paths.find({$or:[{from:data.from,to:data.to,by:data.using},{from:data.to,to:data.from,by:data.using}]},function(err,res)
		{
			if(res.length>0) 
				cb(true);
			else
				cb(false);
		},10);
	}

	function findmrX(data,cb)
	{
		db.teams.distinct("MrX",{name:data},function(err,res)
		{
			cb(res);
		},10);
	}

	function find1(data,cb)
	{
		db.teams.distinct("det1",{name:data},function(err,res)
		{
			cb(res);
		},10);
	}

	function find2(data,cb)
	{
		db.teams.distinct("det2",{name:data},function(err,res)
		{
			cb(res);
		},10);
	}

	function find3(data,cb)
	{
		db.teams.distinct("det3",{name:data},function(err,res)
		{
			cb(res);
		},10);
	}
	
	function findNumPlayed(tn,cb)
	{
		db.teams.distinct("nplayed",{name:tn},function(err,res)
		{
			cb(res);
		},10);
	}

	function findXWon(tn,cb)
	{
		db.teams.distinct("xwin",{name:tn},function(err,res)
		{
			cb(res);
		},10);
	}

	function findDWon(tn,cb)
	{
		db.teams.distinct("dwin",{name:tn},function(err,res)
		{
			cb(res);
		},10);
	}