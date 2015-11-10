import mockBrowser from 'mock-browser';
const browser = new mockBrowser.mocks.MockBrowser();
global.window = browser.getWindow();
global.document = browser.getDocument();

//Angular assumes a browser environment, where assigning angular to the window object results in
//angular being put in the global scope. Since this doesn't hold in node we need to create a manual
//setter on the window object that will copy angular to the global object
Object.defineProperty(window, 'angular', {
	set(val) {
		global.angular = val;
	},
	get() {
		return global.angular;
	}

});
