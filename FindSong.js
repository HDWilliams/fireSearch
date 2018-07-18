//obtain array of YouTube search objects from window
let bgPage = chrome.extension.getBackgroundPage();
//get thumbnail from the objects and add a link to the video and the title of the video
var links = bgPage.matchArray.map(x=> (`<img src='${x.snippet.thumbnails.default.url}' title='${x.snippet.title}'>`).link('https://www.youtube.com/watch?v='+x.id.videoId));
//display thumbnails in popup                 
for (i=0; i<links.length; i++){
	document.write("<p>"+ links[i] +"</p>");
}                                     


