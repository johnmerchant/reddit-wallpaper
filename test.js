var assert = require('assert');

describe('redditWallpaper', function () {
   var redditWallpaper = require('.');
   
   describe('#matchFile()', function () {
      it('should match a valid file from url', function () {
         var match = redditWallpaper.matchFile('http://proof.nationalgeographic.com/files/2014/11/PastedGraphic-2.jpg?asdfquerystring');
         assert(match.length > 2);
         assert.equal(match[1], 'PastedGraphic-2');
         assert.equal(match[2], 'jpg');
      });
   });
   
   describe('#parseType()', function () {
      it('should extract file extension from url', function () {
         var extension = redditWallpaper.parseType('http://i.imgur.com/jEFSFKr.jpg?asdfquerystring');
         assert.equal(extension, 'jpg');
      });
   });
   
   describe('#parseResolution()', function () {
      it('should parse resolution tag from text', function () {
         var resolution = redditWallpaper.parseResolution('Test [1920  x    1080]asdf [OC] [9999x9999]]');
         assert.equal(resolution.width, 1920);
         assert.equal(resolution.height, 1080);
      });
   });
});

