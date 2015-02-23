// Bookmark class
function Bookmark(args) {
	var self = this;
	self.name = ko.observable(args["name"]);
	self.url = ko.observable(args["url"]);
	//self.sub_name = ko.observable(args["sub_name"]);
	//self.sub_url = ko.observable(args["sub_url"]);
}

// Column class
function Column(args) {
	var self = this;
	self.name = args["name"];
	self.bundles = ko.observableArray([]);
}

// Bundle class
function Bundle(args) {
	var self = this;
	if(args["name"]=="") {
		args["name"] = "Links";
	}
	self.name = args["name"];
	self.bookmarks = ko.observableArray([]);
}

function StartViewModel() {
	var self = this;
	
	// All the columns > bundles > bookmarks
	self.columns = ko.observableArray([new Column({name: "Column 1"}), new Column({name: "Column 2"})]);
	
	// All the bundles > bookmarks
	self.bundles = ko.computed(function() {
		var bundles = [];
		for(var i=0; i<self.columns().length; i++) {
			var column = self.columns()[i];
			for(var j=0; j<column.bundles().length; j++) {
				bundles.push( column.bundles()[j] )
			}
		}
		return bundles;
	});
	
	// Get a specific bundle
/*
	self.getBundleByName = function(name) {
		for(var i=0; i<self.bundles().length; i++) {
			var bundle = self.bundles()[i];
			if(bundle.name == name) {
				return bundle;
			}
		}
		return false
	};
*/
	
	/* -- New bookmark add-form --------------------------------- */
	
	// Input value for new bookmark name
	self.newBookmarkName = ko.observable("");
	
	// Input value for new bookmark url
	self.newBookmarkURL = ko.observable("");
	
	// Selected bundle in add form drop-down
	self.selectedBundle = ko.observable("");
	
	// Checkbox for adding a new bundle
	self.wantsNewBundle = ko.observable(false);
	
	// Input value for adding a new bundle
	self.newBundleName = ko.observable("");
	
	// Selected column in add-form drop-down
	self.selectedColumn = ko.observable("");
	
	// Flag for showing/hiding add form
	self.showAddForm = ko.observable(false);
	
	// Function for showing/hiding add form
	self.toggleAddForm = function() {
		if(self.showAddForm()) {
			self.showAddForm(false);
		} else {
			self.showAddForm(true);
		}
	};
	
	// Function determining whether form sufficiently completed
	self.canAddBookmark = ko.computed(function() {
		var verdict = false;
		if(self.newBookmarkName() != "") {
			if(self.newBookmarkURL() != "") {
				if(self.selectedBundle() != "" && self.selectedBundle() != undefined) {
					verdict = true;
				} else if(self.newBundleName() != "") {
					verdict = true;
				}
			}
		}
		return verdict;
	});
	
	// Add a new bookmark
	self.addBookmark = function() {
		var bookmark = new Bookmark({
			name: self.newBookmarkName(),
			url: self.newBookmarkURL()
		});
		var bundle;
		if(self.wantsNewBundle()) {
			// add a new bundle
			bundle = new Bundle({
				name: self.newBundleName()
			});
			bundle.bookmarks.push(bookmark);
			var column = self.selectedColumn();
			column.bundles.push(bundle);
		} else {
			bundle = self.selectedBundle();
			bundle.bookmarks.push(bookmark);
		}
		self.dumpStorage(); // Save changes!
		self.clearAddForm();
		self.toggleAddForm();
	};
	
	// Reset the add form to blank values
	self.clearAddForm = function() {
		self.newBookmarkName("");
		self.newBookmarkURL("");
		self.selectedBundle("");
		self.wantsNewBundle(false);
		self.newBundleName("");
		self.selectedColumn("");
	};
	
	/* -- Editing and rearranging ------------------------------- */
	
	// Flag for reordering
	self.isReordering = ko.observable(false)
	
	// Function for reordering edit mode
	self.toggleEditMode = function() {
		if(self.isReordering()) {
			self.isReordering(false);
		} else {
			self.isReordering(true);
		}
	};
	
	// Just rearranged, check for empty bundles
	self.afterMove = function() {
		var columns = self.columns();
		for(var i=0; i<columns.length; i++) {
			var bundles = columns[i].bundles();
			for(var k=0; k<bundles.length; k++) {
				if(bundles[k].bookmarks().length < 1) {
					self.deleteBundle(bundles[k], columns[i]);
				}
			}
		}
		self.dumpStorage();
	};
	
	// Flag for editing a bookmark
	self.isEditing = ko.observable(false);
	
	// Stop editing mode
	self.stopEditing = function() {
		// Hide the edit form
		self.isEditing(false);
		// Reset form values
		self.updatedName("");
		self.updatedURL("");
		self.openedBookmark = {};
	};
	
	// Show and prepopulate the edit form
	self.startEditing = function(bookmark) {
		// Set the currently opened bookmark
		self.openedBookmark = bookmark;
		// Populate text fields
		self.updatedName(bookmark.name());
		self.updatedURL(bookmark.url());
		// Show edit form
		self.isEditing(true);
	}
	
	// Observables/properties for edit form values
	self.updatedName = ko.observable("");
	self.updatedURL = ko.observable("");
	self.openedBookmark = {};
	
	// Update a bookmark
	self.updateBookmark = function() {
		var bookmark = self.openedBookmark;
		// Make the changes
		bookmark.name(self.updatedName());
		bookmark.url(self.updatedURL());
		// Hide edit form
		self.stopEditing();
		// Save to storage
		self.dumpStorage();
	};
	
	// Delete a bookmark
	self.deleteBookmark = function(bookmark, parents) {
		var bundle = parents[0];
		bundle.bookmarks.remove(bookmark);
		if(bundle.bookmarks().length < 1) {
			self.deleteBundle(bundle, parents[1]);
		}
		if(self.bundles().length < 1) {
			self.isReordering(false);
		}
		self.dumpStorage();
	};
	
	// Delete a bundle
	self.deleteBundle = function(bundle, column) {
		column.bundles.remove(bundle);
	};
	
	/* -- Import / Export --------------------------------------- */
	
	// Flag
	self.isImportExport = ko.observable(false);
	
	// Toggle for import / export view
	self.toggleImportExport = function() {
		if(self.isImportExport()) {
			self.isImportExport(false);
		} else {
			self.isImportExport(true);
		}
	};
	
	// Observable that holds the value of the import textarea
	self.importCode = ko.observable("");
	
	// Override local storage with new bookmarks
	self.importBookmarks = function() {
		if(self.importCode() !== "" && isJsonString(self.importCode())) {
			// Make a backup
			var current_storage = window.localStorage.getItem("com.blakewatson.start");
			window.localStorage.setItem("com.blakewatson.start.backup", current_storage);
			
			// Overwrite main storage
			window.localStorage.setItem("com.blakewatson.start", self.importCode());
			
			// Now load it
			self.loadStorage();
		}
		self.importCode("");
	};
	
	// Select export code to clipboard
	self.selectExportCode = function(element) {
		element.select()
	};
	
	/* -- Interact with local storage --------------------------- */
	
	self.dumpStorage = function() {
		var dump = ko.toJSON(self);
		window.localStorage.setItem("com.blakewatson.start", dump);
		return true;
	};
	
	self.loadStorage = function() {
		if( window.localStorage.getItem("com.blakewatson.start") ) {
			var load = JSON.parse(window.localStorage.getItem("com.blakewatson.start"));
			var columns = [];
			// loop over columns
			for(var i=0; i<load["columns"].length; i++) {
				var this_column = load["columns"][i];
				var new_column = new Column({name: this_column["name"]});
				var bundles = [];
				// loop over bundles
				for(var k=0; k<this_column["bundles"].length; k++) {
					var this_bundle = this_column["bundles"][k];
					var bookmarks = [];
					// loop over bookmarks
					for(var z=0; z<this_bundle["bookmarks"].length; z++) {
						var this_bookmark = this_bundle["bookmarks"][z];
						var new_bookmark = new Bookmark({
							name: this_bookmark["name"],
							url: this_bookmark["url"]
						});
						bookmarks.push(new_bookmark);
					}
					var bundle = new Bundle({
						name: this_bundle["name"]
					});
					bundle.bookmarks(bookmarks);
					bundles.push(bundle);
				}
				new_column.bundles(bundles);
				columns.push(new_column);
			}
			self.columns(columns);
			return true;
		} else {
			return false;
		}
	};
}

var start = new StartViewModel();
ko.applyBindings( start );
start.loadStorage();

$(document).ready(function() {
	$(".loading").hide();
	$(".appview").show();
});

/* -- Helpers ------------------------------------------------ */

function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}