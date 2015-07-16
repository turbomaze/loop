/******************\
| Loop - Pool Game |
| @author Anthony  |
| @version 0.1     |
| @date 2015/07/16 |
| @edit 2015/07/16 |
\******************/

var LoopGame = (function() {
    'use strict';

    /**********
     * config */
    var DIMS = [720, 405]; //canvas dimensions
    var ECC = 0.43; //eccentricity

    /*************
     * constants */

    /*********************
     * working variables */
    var canvas, ctx;

    /******************
     * work functions */
    function initLoopGame() {
        //working variables
        canvas = $s('#canvas');
        canvas.width = DIMS[0];
        canvas.height = DIMS[1];
        ctx = canvas.getContext('2d');

        //event listeners

        //draw the board
        Crush.clear(ctx, 'white');
        drawLoopTable();
    }

    function drawLoopTable() {
        var minAxis = DIMS[1]/2 - 2;
        var focusLength = minAxis/Math.sqrt(Math.pow(ECC, -2)-1);
        var majAxis = Math.sqrt(minAxis*minAxis + focusLength*focusLength);
        Crush.outlineEllipse(
            ctx, [DIMS[0]/2, DIMS[1]/2], focusLength,
            majAxis, 3, 'blue'
        );
    }

    /***********
     * objects */

    /********************
     * helper functions */
    function $s(id) { //for convenience
        if (id.charAt(0) !== '#') return false;
        return document.getElementById(id.substring(1));
    }

    return {
        init: initLoopGame
    };
})();

window.addEventListener('load', LoopGame.init);
