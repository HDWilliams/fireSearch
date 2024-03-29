console.log('Page running...') //debug

//client ID generated by Spotify Api
const clientID = 'db707d9c5fd24c8fbda04f019495273b';
const YouTubeApi = 'AIzaSyCXywugxuP5t_bvEofJjBJtYJPIpX5Xnrs';
const ChromeAppID = 'pkgcgjdndflgmppojlgphfmmpibndbgd';

//adjust to make a playlist in Spotifty (true), or just return videos(false)
const MakeSpotifyPlaylist = true;

//global variables to store final playlist, current OAuth token, and artist of selected song
let playlist = [];
let token = String;
let ArtistID = String;
let userID = String;
let finalIDArray = [];



//adjustable elements to change size and artist variety in playlist
let playlistSize = 10; //num songs in Spotify playlist
let numArtistSongs = 4; //num songs by artist of song selected


//THE FOLLOWING FUNCTIONS ARE USED TO GET OR POST INFORMATION FROM THE SPOTIFY/YOUTUBE APIS

//get promise to return authentication token from Spotify API
//to use chrome.identity, must include specifc permissions in manifest and have specifc url format
let getAuth = function(clientID){
	return new Promise(function(resolve, reject){
		chrome.identity.launchWebAuthFlow({
			url:`https://accounts.spotify.com/authorize?client_id=${clientID}&redirect_uri=https:%2F%2F${ChromeAppID}.chromiumapp.org%2Fcallback&scope=user-read-private%20playlist-modify-private&response_type=token&state=123`,
			'interactive':true}, function(redirect_url){
				if (typeof(redirect_url) === 'string'){
					resolve(redirect_url);
				} else{
					reject(Error('Error logging into Spotify, please check Spotify account or internet connection'));
				}
		})
	})
};

//get search results for a song name, and return artisy ID
let getSpotifySearch = function(query, token){
	return new Promise(function(resolve, reject){
		$.ajax({
			url:`https://api.spotify.com/v1/search?q=${query}&type=track&limit=10`,
			headers:{
				'Authorization': 'Bearer ' + token
			},
			success: function(response){
				if (response.tracks.items.length > 0){
					resolve(response.tracks.items[0].artists[0].id);
				} else {
					reject(Error);
				}
			}, 
			error: function(error){
				reject(Error('Error searching Spotify'));
			}
		})
	})	
};

//get Top 10 songs for an artist 
let getSpotifyTopSongs = function(id, token){
	return new Promise(function(resolve, reject){
		$.ajax({
			url:`https://api.spotify.com/v1/artists/${id}/top-tracks?country=US`,
			headers:{
				'Authorization': 'Bearer ' + token
			},
			success: function(response){
				if (response.tracks.length > 0){
					var temp_playlist = [];
					for (item of response.tracks){
						temp_playlist.push(item);
					}
					resolve(temp_playlist);
				} else {
					reject(Error);
				}
			}, 
			error: function(error){
				reject(Error('Error getting songs of selection. Try another selection'));
			}
		})
	})	
};

//find related artists
let getSpotifyRelated = function(id, token){
	return new Promise(function(resolve, reject){
		$.ajax({
			url:`https://api.spotify.com/v1/artists/${id}/related-artists`,
			headers:{
				'Authorization': 'Bearer ' + token
			},
			success: function(response){
				if (response.artists.length > 0){
					var temp_playlist = [];
					for (item of response.artists){
						temp_playlist.push(item.id);
					}
					resolve(temp_playlist);
				} else {
					reject(Error);
				}
			}, 
			error: function(error){
				console.log(error);// debug statement
				reject(Error('Error getting related artists'));
			}
		})
	})	
};
//get the User's ID 
let getUserID = function(token){
	return new Promise(function(resolve, reject){
		$.ajax({
			url:`https://api.spotify.com/v1/me`,
			headers:{
				'Authorization': 'Bearer ' + token
			},
			success: function(response){
				resolve(response.id);
			}, 
			error: function(error){
				reject(Error('Error getting User ID'));
			}
		})
	})	
};

//POST request to make empty playlist
let makePlaylist = function(userID, token){
	return new Promise(function(resolve, reject){
		$.ajax({
			type: 'POST',
			url:`https://api.spotify.com/v1/users/${userID}/playlists`,
			headers:{
				'Authorization': 'Bearer ' + token,
				'Content-Type': 'application/json'
			},
			data: "{\"name\":\"fireSearch: Rename Playlist\", \"public\":false}",
			success: function(response){
				resolve(response.id);
			}, 
			error: function(error){
				reject(Error('Error making Spotify Playlist'));
			}
		})
	})	
};
//POST request to populate empty playlist with songs from 'playlist' variable
let addToPlaylist = function(userID, playlistID, playlist, token){
	return new Promise(function(resolve, reject){
		$.ajax({
			type: 'POST',
			url:`https://api.spotify.com/v1/users/${userID}/playlists/${playlistID}/tracks?uris=${playlist.toString()}`,
			headers:{
				'Authorization': 'Bearer ' + token,
				'Content-Type': 'application/json'
			},
			success: function(response){
				resolve(response.id);
			}, 
			error: function(error){
				reject(error);
			}
		})
	})	
};
//get results of youtube search of choreography for songs in playlist
let getYouTubeResults = function(query, YouTubeApi){
	return new Promise(function(resolve, reject){
		$.get(`https://www.googleapis.com/youtube/v3/search`, {'maxResults': '25',
                 'part': 'snippet',
                 'q': query,
                 'type': 'videos',
                 'key': 'AIzaSyCXywugxuP5t_bvEofJjBJtYJPIpX5Xnrs'
             },
			function(data){
				if (data.items.length > 0){
					resolve(data);
				} else{
					reject(Error('No Videos Found with this query...'))
				}
			}
		)
	})	
};
//END OF Spotify/YouTube GET or POST FUNCTIONS


//Durstenfeld Shuffle to randomize top songs before selecting
function shuffle(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

//add a menu item to the context menu to search
//upon click get currentSelected word
chrome.contextMenus.create({id:'searchItem', title:'fireSearch', contexts:['selection']});

//on context menu click get promise for OAuth token
chrome.contextMenus.onClicked.addListener(function(info, tab){
	getAuth(clientID).then(function(redirect_url){
		//store value of token the call further get requests
		token = redirect_url.match(/=[^&]*/gi)[0].substring(1);

		//get Artist of highlighted song name
		return getSpotifySearch(encodeURI(info.selectionText), token);

	//get first artist top songs	
	}).then(function(id){
		ArtistID = id;
		return getSpotifyTopSongs(id, token);

	//get random songs from selected song artist
	}).then(function(songs){
		playlist.push(...shuffle(songs).slice(0,numArtistSongs)) //adjust num of artist's songs in playlist
		return getSpotifyRelated(ArtistID, token);
		
		//get related artist top songs
	}).then(function(relatedArtists){
		var artists = shuffle(relatedArtists).slice(0,playlistSize - numArtistSongs); //adjust num of other artists in playlist
		var promises = [];
		for (item of artists){
			promises.push(getSpotifyTopSongs(item, token));
		};
		return Promise.all(promises)

		//take in Array of all related artist songs and randomly choose based on predetermined number
	}).then(function(songArrays){
		let allSongs = [];
		for (item of songArrays){
			allSongs.push(...item);
		}
		
		playlist.push(...shuffle(allSongs).slice(0,playlistSize - numArtistSongs)); //variables set at beginning
		finalIDArray = shuffle(playlist).map(x => 'spotify:track:'+x.id);
		return finalIDArray;

	//get user ID and create playlist
	}).then(function(){
		return getUserID(token)
	}).then(function(user_ID){
		userID = user_ID;
		if (MakeSpotifyPlaylist){
			return makePlaylist(userID, token);
		} else{
			return;
		}
	
	//add songs to playlist
	}).then(function(playlistID){
		if (MakeSpotifyPlaylist){
			return addToPlaylist(userID, playlistID, finalIDArray, token);
		}
	
	//search for youtube search results of choreography to list of songs
	}).then(function(){
		var promises = [];
		for (item of playlist){
			promises.push(getYouTubeResults(`${item.artists[0].name}' '${item.name}' 'choreography`, YouTubeApi));
		};
		return Promise.all(promises);

		// take YouTube Search matches and create array of objects
		//the objects include, among other info the videoID and video title
	}).then(function(matches){
		var matchArray = [];
		for (item of matches){
			var tempItem = item.items[0];
			matchArray.push(tempItem);	
		};

		//store the information in the window to be accessed by the popup when clicked
		window.matchArray = matchArray;
	}).catch(function(error){
		alert(error);
	})
});


