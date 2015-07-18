/******************\
| Loop - Pool Game |
| @author Anthony  |
| @version 0.2     |
| @date 2015/07/16 |
| @edit 2015/07/17 |
\******************/

var LoopGame = (function() {
    'use strict';

    /**********
     * config */
    var DIMS = [720, 405]; //canvas dimensions
    var BALL_RAD = 7.77;
    var BOARD_COLOR = 'green';
    var ECCENTRICITY = 0.43;

    /*************
     * constants */
    var CENTER = [DIMS[0]/2, DIMS[1]/2]; //canvas center
    var MIN_AXIS = CENTER[1] - 2; //minor axis of the board
    var FOCUS_LEN = MIN_AXIS/Math.sqrt(Math.pow(ECCENTRICITY, -2)-1);
    var MAJ_AXIS = Math.sqrt(MIN_AXIS*MIN_AXIS + FOCUS_LEN*FOCUS_LEN);
    var FOCUS1 = [-FOCUS_LEN, 0];
    var FOCUS2 = [FOCUS_LEN, 0];
    var PHI = 0.5+0.5*Math.sqrt(5);
    var EPS = Math.pow(10, -5);

    /*********************
     * working variables */
    var canvas, ctx;
    var balls;
    var currentlyShooting, mouseDownLoc, currMouseLoc;

    /******************
     * work functions */
    function initLoopGame() {
        //working variables
        canvas = $s('#canvas');
        canvas.width = DIMS[0];
        canvas.height = DIMS[1];
        ctx = canvas.getContext('2d');

        balls = [
            new BilliardBall([
                FOCUS1[0] + PHI*FOCUS_LEN,
                FOCUS1[1]
            ], 'white'),
            new BilliardBall(FOCUS1, 'black'),
            new BilliardBall([
                FOCUS1[0], FOCUS1[1]-2*BALL_RAD-2
            ], 'orange'),
            new BilliardBall([
                FOCUS1[0], FOCUS1[1]+2*BALL_RAD+2
            ], '#DF2F3F')
        ];

        currentlyShooting = false;
        mouseDownLoc = [], currMouseLoc = [];

        //event listeners
        canvas.addEventListener('mousedown', function(e) {
            e.preventDefault();
            if (balls[0].getDistFrom([
                currMouseLoc[0] - CENTER[0],
                currMouseLoc[1] - CENTER[1]
            ]) < PHI*balls[0].r) {
                currentlyShooting = true;
                mouseDownLoc = getMousePos(e);
            }
        }, false);
        canvas.addEventListener('mousemove', function(e) {
            e.preventDefault();
            currMouseLoc = getMousePos(e);
        }, false);
        canvas.addEventListener('mouseup', function(e) {
            e.preventDefault();
            if (currentlyShooting) {
                currentlyShooting = false;
                balls[0].vel = [
                    (currMouseLoc[0] - balls[0].pos[0] - CENTER[0])/50,
                    (currMouseLoc[1] - balls[0].pos[1] - CENTER[1])/50
                ];
            }
        }, false);
        canvas.addEventListener('mouseout', function(e) {
            currentlyShooting = false;
        });

        //draw the board
        requestAnimationFrame(render);
    }

    function render() {
        //draw the table
        Crush.clear(ctx, '#EFEFEF');
        drawLoopTable();

        //cursor pointer
        if (balls[0].getDistFrom([
            currMouseLoc[0] - CENTER[0],
            currMouseLoc[1] - CENTER[1]
        ]) < PHI*balls[0].r && balls[0].depth !== -Infinity) {
            canvas.style.cursor = 'pointer';
        } else {
            canvas.style.cursor = 'inherit';
        }

        //draw all the balls
        balls.map(function(ball) {
            if (ball.depth === -Infinity) return; //ignore pocketed balls

            Crush.drawPoint(
                ctx, vecAdd(ball.pos, CENTER),
                BALL_RAD, ball.color
            );
        });

        //simulate friction
        balls.map(function(ball, ballIdx) {
            if (ball.depth === -Infinity) return; //ignore pocketed balls

            ball.vel = ball.vel.map(function(coord) {
                return 1*coord;
            });
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
                    }
                }
            } else {
                ball.depth = 0;
            }
        });

        //draw the arrow
        if (currentlyShooting) {
            Crush.drawArrow(ctx, [
                balls[0].pos[0] + CENTER[0],
                balls[0].pos[1] + CENTER[1]
            ], currMouseLoc, 'white');
        }

        requestAnimationFrame(render);
    }

    function drawLoopTable() {
        //draw the elliptical shape
        Crush.fillEllipse(
            ctx, CENTER, FOCUS_LEN,
            MAJ_AXIS, 3, BOARD_COLOR
        );

        //highlight the focus points
        Crush.drawPoint(ctx, [
            FOCUS1[0]+CENTER[0], FOCUS1[1]+CENTER[1]
        ], 3, 'cyan');
        Crush.drawPoint(ctx, [
            FOCUS2[0]+CENTER[0], FOCUS2[1]+CENTER[1]
        ], BALL_RAD+2*PHI, '#FA0C44');
        Crush.drawPoint(ctx, [
            FOCUS2[0]+CENTER[0], FOCUS2[1]+CENTER[1]
        ], BALL_RAD+PHI, '#690000');
    }

    /***********
     * objects */
    function BilliardBall(pos, color) {
        this.pos = pos;
        this.depth = 0;
        this.color = color;
        this.r = BALL_RAD; //don't let this vary, this game isn't that complex
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
            return this.getDistFrom(b.pos) < 2*BALL_RAD;
        };
        this.isInPocket = function() {
            return this.getDistFrom(FOCUS2) < BALL_RAD+2*PHI;
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
            var overlap = 2*BALL_RAD - Math.sqrt(
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

    /********************
     * helper functions */
    function getMousePos(e) {
        var rect = canvas.getBoundingClientRect();
        return [e.clientX-rect.left, e.clientY-rect.top];
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

window.addEventListener('load', LoopGame.init);
