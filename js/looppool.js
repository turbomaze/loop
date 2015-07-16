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
    var DIMS = [720, 405];

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

        Crush.clear(ctx, 'red');
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
