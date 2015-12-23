"use strict";

const assert = require('assert');

describe('redditWallpaper', function () {
   const redditWallpaper = require(__dirname);
   
   describe('#matchFile()', function () {
      it('should match a valid file from url', function () {
         let match = redditWallpaper.matchFile('http://proof.nationalgeographic.com/files/2014/11/PastedGraphic-2.jpg?asdfquerystring=yes&asdfparam=fsdf%20df');
         assert(match.length > 2);
         assert.equal(match[1], 'PastedGraphic-2');
         assert.equal(match[2], 'jpg');
      });
   });
   
   describe('#parseType()', function () {
      it('should extract file extension from url', function () {
         let extension = redditWallpaper.parseType('http://i.imgur.com/jEFSFKr.jpg?asdfquerystring=yes&asdfparam=fsdf%20df');
         assert.equal(extension, 'jpg');
      });
   });
   
   describe('#parseResolution()', function () {
      it('should parse resolution tag from text', function () {
         let resolution = redditWallpaper.parseResolution('Test!!##123 [1920  x    1080]asdf [OC] [9999x9999]]');
         assert.equal(resolution.width, 1920);
         assert.equal(resolution.height, 1080);
      });
   });
});

