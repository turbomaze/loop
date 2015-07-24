/******************\
| Loop - Pool Game |
| @author Anthony  |
| @version 1.0.1   |
| @date 2015/07/16 |
| @edit 2015/07/21 |
\******************/

/*
 * To embed Loop into a webpage, copy and paste the following code anywhere.
 ------------------------------------------------------------------------------
      <div id="loop-game-container"></div>
      <script>
      var LoopGameConfig = {
          eccentricity: 0.43,
          showCreditLine: true, //false to hide author info
          woodTextureUrl: 'URL_OF_THE_WOOD_TEXTURE',
          clothTextureUrl: 'URL_OF_THE_CLOTH_TEXTURE'
      };
      </script>
      <script src="URL_OF_THIS_JAVASCRIPT_FILE"></script>
 ------------------------------------------------------------------------------
 */

var Crush = (function() {
    //internal helpers
    function resizeCanvas(canvas, every) {
        //adjust the parent's height to ensure you can see the whole canvas
        var newHeight = Math.min(
            parseInt(canvas.parentNode.dataset.initHeight),
            document.documentElement.clientHeight-10
        ) + 'px';
        canvas.parentNode.style.height = newHeight;

        var width = canvas.parentNode.offsetWidth;
        var height = canvas.parentNode.offsetHeight;
        canvas.width = width;
        canvas.height = height;

        every([width, height]);
    }

    return {
        clear: function(ctx, color) {
            ctx.fillStyle = color || 'white';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        },
        getColorStr: function(cols, opacity) {
            var mid = '('+cols[0]+','+cols[1]+','+cols[2];
            if (arguments.length === 2) {
                return 'rgba'+mid+','+opacity+')';
            } else {
                return 'rgb'+mid+')';
            }
        },
        getGradient: function(c1, c2, percent) {
            var ret = [0, 0, 0];

            for (var ai = 0; ai < 3; ai++) {
                ret[ai] = Math.floor(Math.sqrt(
                    percent*c1[ai]*c1[ai] +
                    (1 - percent)*c2[ai]*c2[ai]
                ))%256;
            }

            return ret;
        },
        fillEllipse: function(
            ctx, center, focusDist, majAxis, thickness, color, dir,
            strokeStyle
        ) {
            color = color || 'red';
            dir = dir || 0; //0 means x is the long dimension
            strokeStyle = strokeStyle || color;

            var x = center[0];
            var y = center[1];
            var rx = majAxis;
            var ry = Math.sqrt(majAxis*majAxis - focusDist*focusDist);
            if (dir === 1) {
                var tmp = ry;
                ry = rx, rx = tmp;
            }
            ctx.fillStyle = color;
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = thickness;
            ctx.beginPath();
            if (typeof ctx.ellipse === 'function') {
                ctx.ellipse(x, y, rx, ry, 0, 0, 2*Math.PI);
            } else {
                ctx.save();
                ctx.translate(x, y);
                ctx.scale(rx, ry);
                ctx.arc(0, 0, 1, 0, 2 * Math.PI, false);
                ctx.restore();
            }
            ctx.fill();
            ctx.stroke();
        },
        fillTriangle: function(ctx, pts, color) {
            var triangle = new Path2D();
            triangle.moveTo.apply(triangle, pts[0]);
            triangle.lineTo.apply(triangle, pts[1]);
            triangle.lineTo.apply(triangle, pts[2]);
            ctx.fillStyle = color || 'rgba(0, 0, 255, 0.3)';
            ctx.fill(triangle);
        },
        drawPoint: function(ctx, pos, r, color) {
            ctx.fillStyle = color || 'rgba(255, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(pos[0], pos[1], r, 0, 2*Math.PI, true);
            ctx.closePath();
            ctx.fill();
        },
        drawArrow: function(ctx, start, end, color) {
            //housekeeping
            color = color || 'rgba(140, 255, 255, 1)';
            var wingAngle = Math.PI/8; //in radians
            var wingLen = 20; //in pixels
            //arrow's main body
            this.drawLine(ctx, start, end, color);
            var dir = [end[0] - start[0], end[1] - start[1]];
            var theta = Math.atan(dir[1]/dir[0]);
            //calculating arrow's left wing (orientation: pointing up)
            var phi = ((Math.PI/2) - theta) - wingAngle; //angle between wing and vertical
            var leftxChange = wingLen*Math.sin(phi);
            var leftyChange = wingLen*Math.cos(phi);
            var leftEnd = [0, 0];
            if (end[0] >= start[0]) { //arrow is to the right side of the particle
                leftEnd = [end[0] - leftxChange, end[1] - leftyChange];
            } else { //left side of the particle
                leftEnd = [end[0] + leftxChange, end[1] + leftyChange];
            }
            //calculating arrow's right wing
            var psi = theta - wingAngle; //angle between wing and horizontal
            var rightxChange = wingLen*Math.cos(psi);
            var rightyChange = wingLen*Math.sin(psi);
            var rightEnd = [0, 0];
            if (end[0] >= start[0]) { //arrow is to the right side of the particle
                rightEnd = [end[0] - rightxChange, end[1] - rightyChange];
            } else { //left side of the particle
                rightEnd = [end[0] + rightxChange, end[1] + rightyChange];
            }
            //drawing the arrowhead
            this.fillTriangle(ctx, [end, leftEnd, rightEnd], color);
        },
        drawLine: function(ctx, start, end, color, thickness) {
            ctx.strokeStyle = color || 'rgba(0, 0, 0, 1)';
            ctx.beginPath();
            ctx.moveTo(start[0], start[1]);
            ctx.lineTo(end[0], end[1]);
            ctx.lineWidth = thickness || 3;
            ctx.stroke();
        },

        registerDynamicCanvas: function(canvas, every) {
            canvas.parentNode.dataset.initHeight = canvas
                .parentNode.style.height;
            resizeCanvas(canvas, every); //initial call
            window.addEventListener('resize', function() {
                resizeCanvas(canvas, every);
            });
        }
    };
})();

var LoopGame = (function() {
    'use strict';

    /**********
     * config */
    var DIMS = [752, 423]; //canvas dimensions
    var BALL_RAD_RATIO = 0.0377; //ball radius to major axis ratio
    var BOARD_COLOR = 'green';
    var BORDER_COLOR = '#AD8334';
    var BORDER_THICKNESS_RATIO = 0.1; //the "wooden" border size to maj axis
    var MAX_ARROW_LEN_RATIO = 0.54; //max len of aiming arrow, % of maj axis
    var VEL_CONST = 1/15; //velocity constant, smaller -> higher max speeds
    var ECCENTRICITY = LoopGameConfig.eccentricity;
    var USE_TEXTURES = true;

    /*************
     * constants */
    var CENTER = [DIMS[0]/2, DIMS[1]/2]; //canvas center
    var MIN_AXIS = CENTER[1] - 25; //minor axis of the board
    var FOCUS_LEN = MIN_AXIS/Math.sqrt(Math.pow(ECCENTRICITY, -2)-1);
    var MAJ_AXIS = Math.sqrt(MIN_AXIS*MIN_AXIS + FOCUS_LEN*FOCUS_LEN);
    var FOCUS1 = [-FOCUS_LEN, 0];
    var FOCUS2 = [FOCUS_LEN, 0];
    var PHI = 0.5+0.5*Math.sqrt(5);
    var EPS = Math.pow(10, -1.5); //speeds below this value are rounded to zero
    var FRICTION = [
        104, //larger this is, the longer balls roll for
        1/(1 - 0.98), //the decimal is the lowest friction value
        0.0015 //large -> more random slowing
    ];

    /*********************
     * working variables */
    var canvas, ctx;
    var balls, playerColors, turn, advanceTurn, pocketedOppsBall;
    var moveIsOngoing, gameIsOngoing;
    var currentlyAiming, currMouseLoc;
    var woodTexture, clothTexture;

    /******************
     * work functions */
    function initLoopGame() {
        //working variables
        canvas = $s('#lg-canvas');
        canvas.width = DIMS[0];
        canvas.height = DIMS[1];
        ctx = canvas.getContext('2d');

        //make the canvas adapt to the window size
        $s('#lg-canvas-container').style.height = DIMS[1]+'px';
        Crush.registerDynamicCanvas(canvas, function(dims) {
            //adjust this so you can see the border radius of the shard
            dims[0] -= 6;
            canvas.width = dims[0];

            //recalculate all of the ellipse's variables
            CENTER = [dims[0]/2, dims[1]/2]; //canvas center
            MIN_AXIS = CENTER[1]/(1+2*BORDER_THICKNESS_RATIO); //minor axis
            FOCUS_LEN = MIN_AXIS/Math.sqrt(Math.pow(ECCENTRICITY, -2)-1);
            MAJ_AXIS = Math.sqrt(MIN_AXIS*MIN_AXIS + FOCUS_LEN*FOCUS_LEN);
            if (2*MAJ_AXIS > dims[0] - 50) {
                MAJ_AXIS = CENTER[0] - 25;
                FOCUS_LEN = ECCENTRICITY*MAJ_AXIS;
                MIN_AXIS = Math.sqrt(MAJ_AXIS*MAJ_AXIS - FOCUS_LEN*FOCUS_LEN);
            }
            FOCUS1 = [-FOCUS_LEN, 0];
            FOCUS2 = [FOCUS_LEN, 0];

            if (typeof balls === 'object') {
                balls.map(function(ball) {
                    ball.r = BALL_RAD_RATIO*MAJ_AXIS;
                });
            }
        });

        //analytics
        if (window.location.protocol.indexOf('http') === 0) {
            (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
            (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
            m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
            })(window,document,'script','//www.google-analytics.com/analytics.js','loopGameGA');
            loopGameGA('create', 'UA-47072440-9', 'auto');
            loopGameGA('send', 'pageview');
        }

        //get the textures
        console.log(LoopGameConfig);
        woodTexture = false, clothTexture = false;
        if (USE_TEXTURES) {
            var textures = [
                LoopGameConfig.woodTextureUrl,
                LoopGameConfig.clothTextureUrl
            ];
            var img0 = document.createElement('img');
            img0.style.display = 'none';
            img0.onload = function() {
                woodTexture = ctx.createPattern(this, 'repeat');
            };
            img0.src = textures[0] || 'http://turbomaze.github.io/loop/images/wood_texture.png';
            document.body.appendChild(img0);

            clothTexture = false
            var img1 = document.createElement('img');
            img1.style.display = 'none';
            img1.onload = function() {
                clothTexture = ctx.createPattern(this, 'repeat');
            };
            img1.src = textures[1] || 'http://turbomaze.github.io/loop/images/cloth_texture.png';
            document.body.appendChild(img1);
        }

        //initialize the balls
        initState();

        //misc variables todo with clicking
        currentlyAiming = false;
        currMouseLoc = [];

        //event listeners
        $s('#lg-restart-btn').addEventListener('click', function(e) {
            e.preventDefault();
            initState();
        }, false);
        $s('#lg-orange-option').addEventListener('click', function(e) {
            e.preventDefault();
            if (playerColors[0] === false) {
                playerColors = [2, 3]; //2 is orange
                updateInstructions();
            }
        }, false);
        $s('#lg-red-option').addEventListener('click', function(e) {
            e.preventDefault();
            if (playerColors[0] === false) {
                playerColors = [3, 2]; //3 is read
                updateInstructions();
            }
        }, false);

        function onMouseDown(e) {
            e.preventDefault();
            currMouseLoc = getMousePos(e);
            if (balls[0].getDistFrom([
                currMouseLoc[0] - CENTER[0],
                currMouseLoc[1] - CENTER[1]
            ]) < 2*PHI*balls[0].r) {
                currentlyAiming = true;
            }
        }
        canvas.addEventListener('mousedown', onMouseDown, false);
        canvas.addEventListener('touchstart', onMouseDown, false);
        function onMouseMove(e) {
            e.preventDefault();
            currMouseLoc = getMousePos(e);
        }
        canvas.addEventListener('mousemove', onMouseMove, false);
        canvas.addEventListener('touchmove', onMouseMove, false);
        function onMouseUp(e) {
            e.preventDefault();
            if (currentlyAiming) {
                currentlyAiming = false;
                if (playerColors[0] !== false && !moveIsOngoing) {
                    moveIsOngoing = true;
                    var tentNewVel = [
                        (currMouseLoc[0] - balls[0].pos[0] - CENTER[0]),
                        (currMouseLoc[1] - balls[0].pos[1] - CENTER[1])
                    ];
                    var maxArrowLen = MAX_ARROW_LEN_RATIO*MAJ_AXIS;
                    if (Math.sqrt(Math.pow(tentNewVel[0], 2)+
                        Math.pow(tentNewVel[1], 2)) > maxArrowLen) {
                        tentNewVel = scalarTimes(
                            maxArrowLen, normalize(tentNewVel)
                        );
                    }
                    var newVel = scalarTimes(VEL_CONST, tentNewVel);
                    balls[0].vel = newVel;

                    if (window.location.protocol.indexOf('http') === 0) {
                        loopGameGA('send', 'event', 'game', 'shoot');
                    }
                } else if (playerColors[0] === false) {
                    //they're trying to move but they haven't selected a color
                    $s('#lg-command').innerHTML = '<strong style="color: red">'+
                        $s('#lg-command').innerHTML+
                    '</strong>';
                }
            }
        }
        canvas.addEventListener('mouseup', onMouseUp, false);
        canvas.addEventListener('touchend', onMouseUp, false);
        function onMouseOut(e) {
            currentlyAiming = false;
        }
        canvas.addEventListener('mouseout', onMouseOut, false);
        canvas.addEventListener('touchleave', onMouseOut, false);

        //draw the board
        requestAnimationFrame(render);
    }

    function updateInstructions(madeOpponentsBall) {
        var colors = [false, 'black', 'orange', 'red'];
        function showAllColors() {
            for (var ai = 1; ai < colors.length; ai++) {
                $s('#lg-'+colors[ai]+'-option').style.display = 'inline';
            }
        }
        function hideAllColors() {
            for (var ai = 1; ai < colors.length; ai++) {
                $s('#lg-'+colors[ai]+'-option').style.display = 'none';
            }
        }

        if (playerColors[0] === false) { //game just started
            $s('#lg-command').innerHTML = 'Player 1, pick a color:';
            showAllColors();
            $s('#lg-'+colors[1]+'-option').style.display = 'none';
        } else if (playerColors[0] === Infinity) { //player 1 wins
            $s('#lg-command').innerHTML = '<strong style="color: red">'+
                'Player 1 wins!</strong> Click restart to play again.';
            hideAllColors();
        } else if (playerColors[1] === Infinity) { //player 2 wins
            $s('#lg-command').innerHTML = '<strong style="color: red">'+
                'Player 2 wins!</strong> Click restart to play again.';
            hideAllColors();
        } else if (madeOpponentsBall === true) {
            $s('#lg-command').innerHTML = '<strong style="color: red">Player '+
                (turn+1)+', you pocketed your opponent\'s ball!</strong>';
            hideAllColors();
        } else {
            //game ongoing
            $s('#lg-command').innerHTML = 'Player '+(turn+1)+', try to pocket:';
            hideAllColors();
            $s('#lg-'+colors[playerColors[turn]]+'-option')
                .style.display = 'inline';
        }
    }

    function initState() {
        var ballRad = BALL_RAD_RATIO*MAJ_AXIS;
        balls = [
            new BilliardBall([
                FOCUS1[0] + PHI*FOCUS_LEN,
                FOCUS1[1]
            ], 0, 'white'),
            new BilliardBall(FOCUS1, 1, 'black'),
            new BilliardBall([
                FOCUS1[0], FOCUS1[1]-2*ballRad-2
            ], 2, 'orange'),
            new BilliardBall([
                FOCUS1[0], FOCUS1[1]+2*ballRad+2
            ], 3, '#DF2F3F')
        ];

        playerColors = [false, false];
        turn = 0, advanceTurn = true, pocketedOppsBall = false;
        moveIsOngoing = false, gameIsOngoing = true;

        if (window.location.protocol.indexOf('http') === 0) {
            loopGameGA('send', 'event', 'game', 'start');
        }

        updateInstructions();
    }

    function render() {
        //draw the table
        Crush.clear(ctx, '#F0F0F0 ');
        drawLoopTable();

        //cursor pointer
        if (balls[0].getDistFrom([
            currMouseLoc[0] - CENTER[0],
            currMouseLoc[1] - CENTER[1]
        ]) < 2*PHI*balls[0].r && balls[0].depth !== -Infinity) {
            canvas.style.cursor = 'pointer';
        } else {
            canvas.style.cursor = 'inherit';
        }

        //draw the arrow
        if (currentlyAiming && balls[0].depth !== -Infinity) {
            var start = [
                balls[0].pos[0] + CENTER[0],
                balls[0].pos[1] + CENTER[1]
            ];
            var diff = vecSub(currMouseLoc, start);
            var maxArrowLen = MAX_ARROW_LEN_RATIO*MAJ_AXIS;
            if (Math.sqrt(Math.pow(diff[0], 2)+
                Math.pow(diff[1], 2)) > maxArrowLen) {
                diff = scalarTimes(
                    maxArrowLen, normalize(diff)
                );
            }
            Crush.drawArrow(ctx, start, vecAdd(start, diff), '#EBEBCC');
        }

        //draw all the balls
        balls.map(function(ball) {
            if (ball.depth === -Infinity) return; //ignore pocketed balls

            if (ball.type === playerColors[turn] &&
                !moveIsOngoing && gameIsOngoing) {
                Crush.drawPoint(
                    ctx, vecAdd(ball.pos, CENTER),
                    2*BALL_RAD_RATIO*MAJ_AXIS,
                    'rgba(255,255,255,0.16)'
                );
            }

            var ballColor = ball.color;
            if (!gameIsOngoing) {
                ballColor = Crush.getColorStr([
                    Math.floor(255*Math.random()),
                    Math.floor(255*Math.random()),
                    Math.floor(255*Math.random())
                ]);
            }
            Crush.drawPoint(
                ctx, vecAdd(ball.pos, CENTER),
                BALL_RAD_RATIO*MAJ_AXIS,
                ballColor
            );
        });

        //update their positions and check for wall collisions
        balls.map(function(ball, ballIdx) {
            if (ball.depth === -Infinity) return; //ignore pocketed balls

            //appy velocity
            ball.move();

            //bound
            var distToWall = ball.getDistToWall();
            var distToCenter = -1;
            var wallCollision = false;
            if (distToWall < ball.r) {
                distToCenter = ball.getDistFromCenter();
                var change = distToCenter + distToWall - ball.r;
                change /= distToCenter;
                ball.pos = [change*ball.pos[0], change*ball.pos[1]];
                wallCollision = true;
            }

            //collide with the wall
            if (wallCollision) {
                var k = distToCenter + distToWall;
                k /= ball.getDistFromCenter();
                var collPt = [k*ball.pos[0], k*ball.pos[1]]; //collision point
                var x = collPt[0], y = collPt[1]; //ugh destructured asmts pls
                var dydx = -x*Math.pow(MIN_AXIS, 2);
                dydx /= y*Math.pow(MAJ_AXIS, 2);
                var normVec = normalize([1, -1/dydx]);
                var newVel = vecSub(ball.vel, scalarTimes(
                    2*dot(ball.vel, normVec),
                    normVec
                ));

                ball.vel = newVel;
            }
        });

        //collisions with other balls
        for (var bi = 0; bi < balls.length; bi++) {
            if (balls[bi].depth === -Infinity) continue;
            for (var li = bi+1; li < balls.length; li++) {
                if (balls[li].depth === -Infinity) continue;
                if (balls[bi].isHitting(balls[li])) {
                    balls[bi].collideWith(balls[li]);
                }
            }
        }

        //inside the pocket
        balls.map(function(ball, ballIdx) {
            if (ball.depth === -Infinity) return; //ignore pocketed balls

            if (ball.isInPocket()) {
                ball.depth -= 1/12;
                var perpVec = normalize([
                    ball.pos[0] - FOCUS2[0],
                    ball.pos[1] - FOCUS2[1]
                ]);
                if (ball.depth > -1) {
                    ball.vel = scalarTimes(
                        0.88, vecSub(ball.vel, scalarTimes(0.15, perpVec))
                    );
                } else {
                    ball.vel = scalarTimes(
                        0.7, vecSub(ball.vel, scalarTimes(0.6, perpVec))
                    );
                    var velMag = Math.sqrt(
                        ball.vel[0]*ball.vel[0] + ball.vel[1]*ball.vel[1]
                    );
                    if (ball.getDistFrom(FOCUS2) < 0.1 || velMag < 0.1) {
                        ball.fall();

                        if (gameIsOngoing) {
                            if (playerColors[turn] === ball.type) { //good
                                if (playerColors[turn] === 1) {
                                    //made the black in at the correct time
                                    playerColors[turn] = Infinity; //they win!
                                    gameIsOngoing = false;
                                } else {
                                    //made their color in at the correct time
                                    playerColors[turn] = 1;
                                }
                                updateInstructions(pocketedOppsBall);

                                //so it'll still be their turn
                                advanceTurn = pocketedOppsBall;
                            } else { //uh oh
                                if (ball.type === 0 || ball.type === 1) {
                                    //they made black or white ->
                                    playerColors[1-turn] = Infinity; //opp wins
                                    gameIsOngoing = false;
                                    updateInstructions(pocketedOppsBall);
                                } else {
                                    //they made their opponent's colored ball
                                    playerColors[1-turn] = 1; //opp on black
                                    advanceTurn = true;
                                    pocketedOppsBall = true;
                                    updateInstructions(pocketedOppsBall);
                                }
                            }
                        }
                    }
                }
            } else {
                ball.depth = 0;
            }
        });

        //simulate friction
        var movementStopped = true;
        balls.map(function(ball, ballIdx) {
            if (ball.depth === -Infinity) return; //ignore pocketed balls

            var speed = Math.sqrt(
                Math.pow(ball.vel[0], 2) + Math.pow(ball.vel[1], 2)
            );
            if (speed < EPS) {
                ball.vel = [0, 0];
            } else {
                movementStopped = false;
                var f = 1 - 1/(FRICTION[0]*speed + FRICTION[1]);
                f -= FRICTION[2]*Math.random(); //randomness
                ball.vel = [f*ball.vel[0], f*ball.vel[1]];
            }
        });

        //check to see if a turn ended
        if (movementStopped && moveIsOngoing) {
            moveIsOngoing = false;
            if (gameIsOngoing) {
                if (advanceTurn) turn = 1 - turn;
                else advanceTurn = true;
                pocketedOppsBall = false; //it's a new move
                updateInstructions(pocketedOppsBall);
            }
        }

        requestAnimationFrame(render);
    }

    function drawLoopTable() {
        //draw the elliptical shape
        var borderThickness = BORDER_THICKNESS_RATIO*MAJ_AXIS;
        Crush.fillEllipse(
            ctx, CENTER, FOCUS_LEN,
            MAJ_AXIS+borderThickness/2, borderThickness,
            clothTexture || BOARD_COLOR, 0,
            woodTexture || BORDER_COLOR
        );

        //highlight the focus points
        Crush.drawPoint(ctx, [
            FOCUS1[0]+CENTER[0], FOCUS1[1]+CENTER[1]
        ], BALL_RAD_RATIO*MAJ_AXIS/(PHI*PHI), 'cyan');
        Crush.drawPoint(ctx, [
            FOCUS2[0]+CENTER[0], FOCUS2[1]+CENTER[1]
        ], BALL_RAD_RATIO*MAJ_AXIS*Math.sqrt(2), '#EB1547');
        Crush.drawPoint(ctx, [
            FOCUS2[0]+CENTER[0], FOCUS2[1]+CENTER[1]
        ], BALL_RAD_RATIO*MAJ_AXIS*Math.pow(2, 1/4), '#730000');
    }

    /***********
     * objects */
    function BilliardBall(pos, type, color) {
        this.pos = pos;
        this.depth = 0;
        this.type = type;
        this.color = color;
        this.r = BALL_RAD_RATIO*MAJ_AXIS; //don't let this vary; simple game
        this.vel = [0, 0]; //no velocity

        this.move = function() {
            this.pos = [
                this.pos[0] + this.vel[0],
                this.pos[1] + this.vel[1]
            ];
        };
        this.fall = function() {
            this.vel = [0, 0];
            this.depth = -Infinity;

            if (window.location.protocol.indexOf('http') === 0) {
                loopGameGA('send', 'event', 'game', 'pocket');
            }
        };
        this.getDistFrom = function(pt) {
            return Math.sqrt(
                Math.pow(this.pos[0] - pt[0], 2) +
                Math.pow(this.pos[1] - pt[1], 2)
            );
        };
        this.getDistFromCenter = function() {
            //returns the distance from this ball to the center of the table
            return this.getDistFrom([0, 0]);
        };
        this.getDistToWall = function(afafs) {
            //returns the distance from the ball to the side of the loop table
            //in the direction of the center of the table through the ball
            var theta = Math.atan2(this.pos[1], this.pos[0]+FOCUS_LEN);
            var rad_ = MAJ_AXIS*(1 - Math.pow(ECCENTRICITY, 2));
            rad_ /= 1 - ECCENTRICITY*Math.cos(theta);
            var x = rad_*Math.cos(theta) - FOCUS_LEN;
            var y = rad_*Math.sin(theta);
            return Math.sqrt(x*x + y*y) - this.getDistFromCenter();
        };
        this.isHitting = function(b) {
            return this.getDistFrom(b.pos) < 2*BALL_RAD_RATIO*MAJ_AXIS;
        };
        this.isInPocket = function() {
            return this.getDistFrom(FOCUS2) < BALL_RAD_RATIO*MAJ_AXIS+2*PHI;
        }
        this.collideWith = function(b) {
            //get the velocity in terms of tangential and normal components
            var normSlope = (this.pos[1]-b.pos[1])/(this.pos[0]-b.pos[0]);
            var perpVec = normalize([1, normSlope]);
            var parallelVec = normalize([-normSlope, 1]);

            //new velocities are projections of the relative velocity on the
            //tangent/normal vectors
            var newVel1 = vecAdd(
                b.vel,
                scalarTimes(
                    dot(parallelVec, vecSub(this.vel, b.vel)),
                    parallelVec
                )
            );
            var newVel2 = vecAdd(
                b.vel,
                scalarTimes(
                    dot(perpVec, vecSub(this.vel, b.vel)),
                    perpVec
                )
            );
            this.vel = newVel1;
            b.vel = newVel2;

            //they collided, so they're overlapping. undo that and move more
            var overlap = 2*BALL_RAD_RATIO*MAJ_AXIS - Math.sqrt(
                Math.pow(this.pos[0] - b.pos[0], 2) +
                Math.pow(this.pos[1] - b.pos[1], 2)
            );
            var offsetVec = scalarTimes(overlap/2, parallelVec);
            this.pos = vecAdd(this.pos, offsetVec);
            b.pos = vecSub(b.pos, offsetVec);
            this.move();
            b.move();
        };
    }

    function AsyncTrain(chooChoo, getNextDelay) {
        var self = this;
        this.timer = null;
        this.isPaused = false;
        this.delayFunc = getNextDelay;
        this.count = 0;
        this.run = function() {
            var keepGoing = chooChoo(this.count);
            this.count++;
            if (keepGoing) {
                this.timer = setTimeout(function() {
                    self.run();
                }, this.delayFunc());
            } else {
                //stop
            }
        };
        this.pause = function() {
            //pause here
            this.isPaused = !this.isPaused;
            if (this.isPaused) { //they're pausing
                clearTimeout(this.timer);
            } else { //they're unpausing
                this.timer = setTimeout(function() {
                    self.run();
                }, this.delayFunc());
            }
        };
        this.setDelayFunc = function(func) {
            this.delayFunc = func;
        };
    }

    /********************
     * helper functions */
    function getMousePos(e) {
        var rect = canvas.getBoundingClientRect();
        if (e.type.indexOf('mouse') === 0) { //mouse
            return [e.clientX-rect.left, e.clientY-rect.top];
        } else { //touch
            return [
                e.changedTouches[0].pageX-rect.left-window.pageXOffset,
                e.changedTouches[0].pageY-rect.top-window.pageYOffset
            ];
        }
    }
    function scalarTimes(s, a) {
        return a.map(function(comp) {
            return s*comp;
        });
    }
    function vecAdd(a, b) {
        return a.map(function(comp, idx) {
            return comp + b[idx];
        });
    }
    function vecSub(a, b) {
        return a.map(function(comp, idx) {
            return comp - b[idx];
        });
    }
    function normalize(vec) {
        var mag = Math.sqrt(vec.reduce(function(acc, comp) {
            return acc + comp*comp;
        }, 0));
        return vec.map(function(comp) {
            return comp/mag;
        });
    }
    function dot(a, b) {
        return a.reduce(function(acc, el, idx) {
            return acc + el*b[idx];
        }, 0);
    }
    function $s(id) { //for convenience
        if (id.charAt(0) !== '#') return false;
        return document.getElementById(id.substring(1));
    }

    return {
        init: initLoopGame
    };
})();

window.addEventListener('load', function() {
    function $s(id) { //for convenience
        if (id.charAt(0) !== '#') return false;
        return document.getElementById(id.substring(1));
    }

    //prep the CSS
    var css = document.createElement('style');
    css.innerHTML = ''+
        '.lg {'+
            'position: relative;'+
            '-webkit-box-sizing: border-box;'+
            '-moz-box-sizing: border-box;'+
            'box-sizing: border-box;'+
            'font-family: sans-serif;'+
            'font-size: 1.25rem;'+
        '}'+
        '.lg-container {'+
            'max-width: 960px;'+
            'margin: 0 auto;'+
            'padding: 0 30px;'+
            'padding: 0 1.5rem;'+
        '}'+
        '.lg-grid {'+
            'margin-left: -3%;'+
            'max-width: 105%;'+
        '}'+
        '.lg-unit {'+
            'display: inline-block;'+
            'vertical-align: top;'+
            'margin-left: 3%;'+
            'margin-right: -.25rem;'+
            'overflow: hidden;'+
            'overflow: visible;'+
        '}'+
        '.lg-one-of-five { width: 17.07%; }'+
        '.one-of-three { width: 30.36%; }'+
        '.two-of-three { width: 63.666666666%; }'+
        '.lg-four-of-five { width: 77%; }'+
        '.lg-span-grid { width: 97%; }'+
        '@media screen and (max-width: 550px) {'+
        	'.lg-grid {'+
        		'margin-left: 0;'+
        		'max-width: none;'+
        	'}'+
        	'.lg-unit {'+
        		'width: auto;'+
        		'margin-left: 0;'+
        		'display: block;'+
        	'}'+
        '}'+
        '#lg-canvas-container {'+
            'text-align: center;'+
            'padding: 0;'+
        '}'+
        '.lg-orange { background: #F5A91B; }'+
        '.lg-red { background: #E04F4F; }'+
        '.lg-black { background: #343536; }'+
        '.lg-color-option {'+
            'text-transform: uppercase;'+
            'color: white;'+
            'font-size: 0.75rem;'+
            'padding: 0.25rem 1rem;'+
            'border-radius: 2px;'+
            'cursor: pointer;'+
            'margin-right: 0.5em;'+
        '}'+
        '#lg-instructions { margin-bottom: 0.25rem; }'+
        '.lg-shard {'+
            'background: #F0F0F0;'+
            'border-radius: 3px;'+
            'padding: 10px;'+
            'margin-bottom: 10px;'+
            '-webkit-box-shadow: 0 1px 1px rgba(0, 0, 0, 0.15);'+
            '-moz-box-shadow: 0 1px 1px rgba(0, 0, 0, 0.15);'+
            'box-shadow: 0 1px 1px rgba(0, 0, 0, 0.15);'+
        '}'+
        '.lg-credit, .lg-credit a.lg {'+
            'font-size: 1rem;'+
        '}'+
        '.lg-credit a.lg {'+
            'text-decoration: none;'+
            'color: #3BB023;'+
            'font-weight: bold'+
        '}'+
        'a.lg-btn {'+
            'padding: 2px 4px;'+
            'border-radius: 4px;'+
            'background-color: #3BB023;'+
            'color: white;'+
            'text-decoration: none;'+
            'text-align: center;'+
            'cursor: pointer'+
        '}'+
        'a.lg-btn:hover { background-color: #34A61E; }'+
        'a.lg-btn:active { background-color: #24960E; }';
    document.head.appendChild(css);

    //prep the HTML
    var creditLine = '';
    if (LoopGameConfig.showCreditLine) {
        creditLine = '<div class="lg lg-credit lg-unit lg-span-grid">'+
            '<div class="lg-unit lg-one-of-three">'+
                '<iframe src="https://ghbtns.com/github-btn.html?user=turbo'+
                    'maze&repo=loop&type=star&count=true" frameborder="0" '+
                    'scrolling="0" width="170px" height="20px">'+
                '</iframe>'+
            '</div>'+
            '<div class="lg-unit lg-two-of-three">'+
                'Game by <a class="lg" '+
                    'href="https://igliu.com" target="_blank">'+
                    'Anthony Liu'+
                '</a>'+
            '</div>'+
        '</div>';
    }
    $s('#loop-game-container').innerHTML = '<div class="lg lg-container">'+
    '<div class="lg lg-grid">'+
        '<div class="lg lg-shard lg-unit lg-span-grid">'+
            '<div class="lg lg-unit lg-four-of-five" id="lg-instructions">'+
                '<span class="lg" id="lg-command"></span>'+' '+
                '<span id="lg-orange-option" '+
                      'class="lg lg-orange lg-color-option" '+
                      'style="display: none">'+
                    'orange'+
                '</span>'+
                '<span id="lg-red-option" '+
                      'class="lg lg-red lg-color-option" '+
                      'style="display: none">'+
                    'red'+
                '</span>'+
                '<span id="lg-black-option" '+
                      'class="lg lg-black lg-color-option" '+
                      'style="display: none">'+
                    'black'+
                '</span>'+
            '</div>'+
            '<a href="#" id="lg-restart-btn" '+
               'class="lg lg-btn lg-unit lg-one-of-five">'+
                'Restart'+
            '</a>'+
        '</div>'+
        '<div class="lg lg-unit lg-span-grid lg-shard" id="lg-canvas-container">'+
            '<canvas class="lg" id="lg-canvas"></canvas>'+
        '</div>'+creditLine+
    '</div></div>';

    LoopGame.init();
});
