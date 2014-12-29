/* Copyright (c) 2006-2008 MetaCarta, Inc., published under the Clear BSD
 * license.  See http://svn.openlayers.org/trunk/openlayers/license.txt for the
 * full text of the license. */

/**
 * Small class to create a heat or density map for points
 * on a canvas element.
 * 
 * Usage:
 * 
 *      var heatMap = new HeatMap(500, 500);
 *      heatMap.addPoint(10, 10);
 *      heatMap.addPoint(15, 15);
 *      ...
 *      var canvas = document.getElementById("canvas");
 *      heatMap.create(canvas);
 *      
 * The generation of the heat map can also be run in a web worker using
 * the method 'createAsync(..)' (Chrome 6+ only).
 * 
 * 
 * @param {int} width - Canvas width
 * @param {int} height - Canvas height
 * @param {Array} colorSchema - Optional - a coloring schema
 */
var HeatMap = function(width, height, colorSchema) {
    this.pointSize = 30;
    
    this.width = width;
    this.height = height;
    
    this.points = [];
    
    this.colorMap = null;
    
    if (colorSchema === undefined) {
        this.colorSchema = HeatMap.DEFAULT_SCHEMA;
    } else {
        this.colorSchema = colorSchema;
    }
    
    /**
     * Adds a point.
     * 
     * @param {int} x
     * @param {int} y
     */
    this.addPoint = function(x, y) {
        this.points.push({x: x, y: y});    
    };
    
    /**
     * Creates the heat map with the previously added points.
     * 
     * @param {Canvas} canvas - Optional
     * @return {Canvas}  The canvas on which the heat map is drawn
     */
    this.create = function(canvas) {
        var context = {
            canvas: canvas,
            canvasContext: null    
        };
        
        // create the intensity map 
        this.prepareForColoring(context);
        
        // colorize the intensity map
        context.imageData = this.getImageData(context);
        HeatMap.colorizeIntensityMask(context.imageData, context.colorMap);
        
        // write the manipulated image data back to the canvas
        this.writeImageDataToCanvas(context);
        
        return this.canvas;  
    };  

    /**
     * Creates the heat map, but the coloring is run in a web worker.
     * 
     * @param {Canvas} canvas - Optional
     * @param {Function} callbackDone - Called when the heat map generation is finished. The
     *                                  function receives a single argument, the drawn canvas.
     * @param {Function} callbackStatus - Optional, called for progress updates
     * @param {Function} callbackError - Optional, called in case of an error
     * @param {String} webworkerPath - Optional, the path to the web worker script 
     *                                  (default: 'heatmap-webworker.js')
     * @param {Intenger} numberOfWebWorkers - Optional, the number of web workers,
     *                                  on which the task will be split. 
     */
    this.createAsync = function(canvas, callbackDone, callbackStatus, callbackError,
                                    webworkerPath, numberOfWebWorkers) {
        if (webworkerPath === undefined) {
            webworkerPath = "heatmap-webworker.js";
        }
        if (numberOfWebWorkers === undefined) {
            numberOfWebWorkers = 4;
        }                                    
                  
        var context = {
            canvas: canvas,
            canvasContext: null,
            imageData: null,
            colorMap: null,
            heatMap: this    
        };
        
        // create the intensity map
        this.prepareForColoring(context);
        
        // this method will be called when all web workers
        // completed, successful or not
        var callbackFinished = function(event) {
            if (!event.error) {
                // coloring is finished, execute the callback function
                callbackDone(context.canvas);    
            } else {
                // one of the web workers reported an error, redirect this error
                if (callbackError) {
                    callbackError(event.error); 
                }  
            }
        };
        
        var barrier = new CanvasBarrier(
                            numberOfWebWorkers, 
                            context.canvasContext, 
                            webworkerPath, 
                            callbackFinished,
                            callbackStatus, 
                            {
                                colorMap: context.colorMap
                            });
                    
        barrier.start();
    };

    /**
     * Creates the canvas (if necessary), draws the grey-scale 
     * intensity map and creates a color map. 
     * 
     * @param {Object} context - Optional
     */    
    this.prepareForColoring = function(context) {
        this.setupCanvas(context);
        
        this.createIntensityMask(context);
        context.colorMap = this.getColorMap();
    };
    
    /**
     * If no canvas is given, a new canvas element is created. Then
     * the size is set.
     * 
     * @param {Canvas} canvas
     */
    this.setupCanvas = function(context) {
        if (context.canvas === undefined || context.canvas === null) {
            context.canvas = document.createElement("canvas");    
        } 
        context.canvasContext = context.canvas.getContext('2d'); 
        
        context.canvas.width = this.width;
        context.canvas.height = this.height;    
    };  
    
    /**
     * Creates a grey-scale intensity map. 
     * 
     * Every point is drawn on the canvas as circle with a radial gradient 
     * whereas the gradient varies in the alpha value.
     */
    this.createIntensityMask = function(context) {
        // see: https://developer.mozilla.org/en/Canvas_tutorial/Compositing
        // this.canvasContext.globalCompositeOperation = 'darker'; // ?
        
        for (var i = 0; i < this.points.length; i++) {
            var x = this.points[i].x;
            var y = this.points[i].y;

            var radialGradient = context.canvasContext.createRadialGradient(x, y, 0, x, y, this.pointSize);
            radialGradient.addColorStop(0, 'rgba(10, 10, 10, 255)');  
            radialGradient.addColorStop(1, 'rgba(10, 10, 10, 0)'); 
            
            context.canvasContext.fillStyle = radialGradient;  
            context.canvasContext.fillRect(0, 0, width, height); 
        } 
    };
    
    this.getImageData = function(context) {
        return context.canvasContext.getImageData(0, 0, this.width, this.height);    
    };
    
    this.writeImageDataToCanvas = function(context) {
        context.canvasContext.putImageData(context.imageData, 0, 0);    
    };
    
    /**
     * Create the color map by drawing a linear gradient
     * on a 256x1 canvas using the color schema.
     * 
     * @return {ImageData}
     */
    this.getColorMap = function() {
        if (this.colorMap !== null) {
            return this.colorMap;
        }
        
        var colorSchemaCanvas = document.createElement("canvas");
        var ctx = colorSchemaCanvas.getContext('2d');  
        
        colorSchemaCanvas.width = 256;
        colorSchemaCanvas.height = 1;
        
        var linearGradient = ctx.createLinearGradient(0, 0.5 , 256, 0.5);  
        
        for (var i = 0; i < this.colorSchema.length; i++) {
            var step = this.colorSchema[i][0];
            var color = this.colorSchema[i][1];
            
            linearGradient.addColorStop(step, color); 
        }
        
        ctx.fillStyle = linearGradient;
        ctx.fillRect(0, 0 , 256, 1);   
       
        this.colorMap = ctx.getImageData(0, 0, 256, 1);
        return this.colorMap;   
    };
}; 

/**
 * Colorizes the grey-scale intensity map. For each pixel
 * of the canvas a color is determined by its alpha value
 * using the color map.
 * 
 * @param {ImageData} imageData - The grey-scale density map
 * @param {ImageData} colorMap - The color scheme to use
 * @param {Function} callbackProgress - Called when the progress changes
 */
HeatMap.colorizeIntensityMask = function(imageData, colorMap, callbackProgress) {
    if (callbackProgress) {
        var numPixels = imageData.width * imageData.height;
        var lastProgress = 0;
    }
    
    for (var y = 0; y < imageData.height; y++) {
        for (var x = 0; x < imageData.width; x++) {
            if (callbackProgress) {
                // report progress
                var progress = Math.round((((y * imageData.width) + x) / numPixels) * 100);
                
                if (progress > lastProgress) {
                    // only report if the progress changed
                    lastProgress = progress;
                    callbackProgress({progress: progress})
                }
            }    
            
            var alpha = HeatMap.getPixelValue(imageData, x, y, 3);
            
            var r = 255;
            var g = 255;
            var b = 255;
            var a = 0;
            
            if (alpha !== 0) {
                // only the change the pixel's color if it is not transparent
                var r = HeatMap.getPixelValue(colorMap, alpha, 0, 0); 
                var g = HeatMap.getPixelValue(colorMap, alpha, 0, 1);  
                var b = HeatMap.getPixelValue(colorMap, alpha, 0, 2); 
                var a = 255;
            }
            
            HeatMap.setPixelValue(imageData, x, y, r, 0);
            HeatMap.setPixelValue(imageData, x, y, g, 1);
            HeatMap.setPixelValue(imageData, x, y, b, 2);
            HeatMap.setPixelValue(imageData, x, y, a, 3);   
        }
    }    
};

HeatMap.getPixelValue = function(imageData, x, y, argb) {
    return imageData.data[((y*(imageData.width*4)) + (x*4)) + argb];    
};

HeatMap.setPixelValue = function(imageData, x, y, value, argb) {
    imageData.data[((y*(imageData.width*4)) + (x*4)) + argb] = value;    
};

/**
 * Color schema borrowed from gheat (http://code.google.com/p/gheat/)
 */
HeatMap.DEFAULT_SCHEMA = [
    [0, 'rgba(255, 255, 255, 0)'],  
    [0.05, '#35343d'],  
    [0.15, '#050555'],  
    [0.3, '#00eaf2'],  
    [0.45, '#00b441'],  
    [0.6, '#dcfc05'],  
    [0.8, '#ff0101'],  
    [1, '#ffeded']
];
