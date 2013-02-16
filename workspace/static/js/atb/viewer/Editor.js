goog.provide('atb.viewer.Editor');

goog.require('goog.dom');
goog.require('goog.dom.DomHelper');
goog.require('goog.editor.Command');
goog.require('goog.editor.Field');

goog.require('goog.editor.plugins.BasicTextFormatter');
goog.require('goog.editor.plugins.EnterHandler');
goog.require('goog.editor.plugins.HeaderFormatter');
goog.require('goog.editor.plugins.LinkBubble');
goog.require('goog.editor.plugins.LinkDialogPlugin');
goog.require('goog.editor.plugins.ListTabHandler');
goog.require('goog.editor.plugins.LoremIpsum');
goog.require('goog.editor.plugins.RemoveFormatting');
goog.require('goog.editor.plugins.SpacesTabHandler');
goog.require('goog.editor.plugins.UndoRedo');
goog.require('goog.ui.editor.DefaultToolbar');
goog.require('goog.ui.editor.ToolbarController');

goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.editor.Command');
goog.require('goog.cssom.iframe.style');

goog.require('atb.viewer.Finder');
goog.require('atb.viewer.Viewer');

goog.require('jquery.jQuery');

//begin radial menus test includes:
goog.require('atb.Util');
goog.require('atb.widgets.IMenu');
goog.require('atb.widgets.Toolbar');
goog.require('atb.widgets.MenuItem');
goog.require('atb.widgets.MenuUtil');
goog.require('atb.debug.DebugTools');//HACK
goog.require('atb.util.StyleUtil');
goog.require('atb.util.ReferenceUtil');
//end radial menus test includes

goog.require('goog.ui.IdGenerator');

goog.require('atb.util.HtmlUtil');

goog.require('atb.widgets.DialogWidget');
goog.require('atb.ClientApp');

goog.require('atb.viewer.TextEditorAnnotate');
goog.require('atb.viewer.EditorPropertiesPane');

goog.require('goog.events.PasteHandler');
goog.require('atb.util.Set');

goog.require('atb.widgets.GlassPane');
goog.require('atb.widgets.ForegroundMenuDisplayer');

goog.require('atb.events.ResourceClicked');
goog.require('atb.events.ResourceModified');

goog.require('atb.viewer.TextThumbnail');

/**
 * atb.viewer.Editor
 * Creates a Text Editor
 *
 * @constructor
 *
 * @extends {atb.viewer.Viewer}
 * 
 * @param clientApp {!atb.ClientApp}
 * @param opt_initialTextContent {string=}
 * @param opt_annoBodyId {string=}
 **/
atb.viewer.Editor = function(clientApp, opt_initialTextContent, opt_annoBodyId) {
	atb.viewer.Viewer.call(this, clientApp);
    
    this.viewerType = 'text editor';
	
    this.styleRoot = this.clientApp.getStyleRoot();
	
	this.bDeleteHighlightMode = false;
	
	this.isAnnoText = false;
	
	var id = atb.util.HtmlUtil.generateUniqueId();
	this.useID = id;

    this._title = null;
    this.resourceId = null;
	
	opt_initialTextContent = atb.util.ReferenceUtil.applyDefaultValue(opt_initialTextContent, null);
	this._initialTextContent_ =opt_initialTextContent;//lolhack!//HACK

    this.inAnnoMode = false;
    if(opt_annoBodyId) {
        this.setAnnotationBodyId(opt_annoBodyId);
    }
	
    this.purpose = 'other';
    
    this.crawler = this.clientApp.getResourceCrawler();
    
    this.scrollTop = 0;

    var db = this.clientApp.databroker;

};
goog.inherits(atb.viewer.Editor, atb.viewer.Viewer);

atb.viewer.Editor.VIEWER_TYPE = 'text editor';

atb.viewer.Editor.prototype.autoSaveInterval = 10 * 1000;

/**
 * getSanitizedHtml()
 * @return {string} the html contents of the editor with unwanted tags (such as <script>) removed
 **/
atb.viewer.Editor.prototype.getSanitizedHtml = function () {
	return this.field.getCleanContents();
};

/**
 * setHtml(htmlString)
 * sets the contents of the editor to the specified string
 * @param {!string} htmlString the html to be written to the editor
 **/
atb.viewer.Editor.prototype.setHtml = function (htmlString, opt_fireDelayedChange) {
    if(this.field) {
	    this.field.setHtml(false, htmlString, !opt_fireDelayedChange);
    }
};

/*
//partially implemented, but hopeless probably:
atb.viewer.Editor.prototype.fixPastedSpans = function()
{
	var tag = this.field.field;//hack
	fixPastedSpans_visitRecursively_(tag);
};
atb.viewer.Editor.prototype.fixPastedSpans_visitRecursively_ = function(tag)
{
	if (this.isAnnotationSpan(tag))
	{
	}
	
	var self =this;
	var jqContents = jQuery(tag).children();
	jqContents.each(function()
	{
		var childTag = this;
		
		var childTagName = childTag.nodeName;//or tagName...?
	
};
*/
atb.viewer.Editor.prototype.onTextPasted = function()
{
	//this.fixPastedSpans();
	
	this.applyFormattingRules();
};

/**
 * setHtmlWithAutoParagraphs(htmlString)
 * sets the contents of the editor to the specified string using goog's auto paragraph formatting
 * @param {!string} htmlString the html to be written to the editor
 **/
atb.viewer.Editor.prototype.setHtmlWithAutoParagraphs = function (htmlString) {
	this.field.setHtml(true, htmlString);
	this.onSetHTML();
};

/**
 * addStylesheetToEditor(stylesheetURI)
 * adds the specified stylesheet to the editor iframe
 * @param stylesheetURI {!string} the URI of the stylesheet *relative to the html document*
 **/
atb.viewer.Editor.prototype.addStylesheetToEditor = function (stylesheetURI) 
{
    var linkElement = this.editorIframe.document.createElement('link');
    linkElement.setAttribute('rel', 'stylesheet');
    linkElement.setAttribute('href', stylesheetURI);

    var head = this.editorIframe.document.getElementsByTagName('head')[0];

    head.appendChild(linkElement);
};

/**
 * Updates the {atb.resource.TextResource} object with the content from the text editor
 * @return {atb.resource.TextResource | null} the updated TextResource object
 */
atb.viewer.Editor.prototype.updateResourceObject = function () {
    if (! this.textResource) {
        this.textResource = new atb.resource.TextResource(this.resourceId, this.resourceId);
    }
    
    this.textResource.remoteId = this.resourceId;
    this.textResource.id = this.resourceId;
    
    this.textResource.title = this.getTitle();
    this.textResource.contents = this.getSanitizedHtml();
    this.textResource.purpose = this.purpose;
    
    return this.textResource;
};

/**
 * saveContents
 * @param opt_doAfter {function=}
 * @param opt_doAfterScope {object=}
 **/
atb.viewer.Editor.prototype.saveContents = function (
    opt_doAfter, opt_doAfterScope, opt_synchronously
) {
    if (this.resourceId == null) {
        this.resourceId = this.databroker.createUuid();
    } else {
        //Only makes a server request if local ids are being used in this editor
        this.updateAllPropertiesFromPane();
        
        this.unsavedChanges = false;
        
        var resourceObject = this.updateResourceObject();

        this.clientApp.databroker.updateTextResource(
            resourceObject.id,
            resourceObject.contents,
            {
                'title': resourceObject.title, 
                'purpose': resourceObject.purpose
            }
        );
        
        this.registerThumbnailToPanel();
    }
};


/** @deprecated */
atb.viewer.Editor.prototype.replaceLocalIdsWithServerIds = function (
    annotations, 
    ids
) {
    for (var a=0; a<annotations.length; a++) {
        var anno = annotations[a];
        
        var annoClasses = anno.className.split(' ');
        
        var annoIdClass = '';
        
        for (var i in annoClasses) {
            if (annoClasses[i].indexOf(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_LOCAL_ID) != -1) {
                annoIdClass = annoClasses[i];
                break;
            }
        }
		//TODO: maybe check that we don't repeat this work over and over...?
        if (annoIdClass != '') {
			jQuery("."+annoIdClass, this.field.field).each(function()
			{
				//jQuery(anno).removeClass(annoIdClass);
				
				//jQuery(anno).addClass(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_ID + ids[a]);
				var jqNode = jQuery(this);//note: this is the dom node
				var replacementCssClassName = "" + atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_ID + ids[a];
				
				jqNode.removeClass(annoIdClass);
				
				jqNode.addClass(replacementCssClassName);
			});
        }
        
    }
};

/** @deprecated */
atb.viewer.Editor.prototype.isUsingLocalIds = function (opt_annotations) {
    var domHelper = this.field.getEditableDomHelper();

    var annotations = opt_annotations || domHelper.getElementsByClass(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS);

    for (var a=0; a<annotations.length; a++) {
        var anno = annotations[a];

        var annoClasses = anno.className.split(' ');

        for (var i in annoClasses) {
            if (annoClasses[i].indexOf(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_LOCAL_ID) != -1) {
                return true;
            }
        }

    }
    return false;
};

/** @deprecated */
atb.viewer.Editor.prototype.getIdsFromServerAndReplaceLocalsAsNeeded = function (onFinish, onFinishScope) {
    if(this.isUsingLocalIds(annotations)) {
        var domHelper = this.field.getEditableDomHelper();
        var annotations = domHelper.getElementsByClass(
                                                       atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS
                                                       );
        
        this.webService.withUidList(
            annotations.length,
            function (ids) {
                this.replaceLocalIdsWithServerIds(annotations, ids);
                
                onFinish.call(onFinishScope);
            },
            this
        );
    }
    else {
        onFinish.call(onFinishScope);
    }
};

/**
 * scrollIntoView
 * centers the editor view scroll with the tag roughly in the center
 * @param tag {Element} highlight span
 **/
atb.viewer.Editor.prototype.scrollIntoView = function (tag) {//console.log(tag);
    if(tag) {

        // position scrollbar to the position of the tag in the editor
        // subtract half the height of the editor so that it's centered if possible
        var scrollFunction = atb.Util.scopeAsyncHandler(function () {
            var editorHeight = this.editorIframe.document.body.clientHeight;
            var editorHalf =  Math.round(editorHeight/2);
            var tagVerticalOffset = jQuery(tag).offset().top;
            
            jQuery(this.editorIframe).scrollTop(tagVerticalOffset - editorHalf);
            
            var textEditorAnnotate = this.field.getPluginByClassId('Annotation');
            var hoverAnnotationId = atb.viewer.TextEditorAnnotate.getAnnotationId(tag);
            textEditorAnnotate.setSelectedAnnotationHelper(hoverAnnotationId, tag);
        }, this);
        
    	var t = setTimeout(scrollFunction, 100);

    }
};

atb.viewer.Editor.prototype.scrollIntoViewByResourceId = function (resourceId) {
    var tag = this.field.getPluginByClassId('Annotation').getAnnotationTagByResourceId(resourceId);

    this.scrollIntoView(tag);
};

atb.viewer.Editor.prototype.toggleAnnotationMode = function (inAnnoMode) {
    this.inAnnoMode = inAnnoMode;
};

atb.viewer.Editor.prototype.resize = function (size) {

	this.width=size.width;
	this.height=size.height;
	
	var elem = this.domHelper.getElement(this.useID);
	var style;
        
	if (elem != null)
	{
		style =elem.style;
		style.height = size.height;
	}

	if (this.toolbarDiv != null)
	{
        jQuery(this.toolbarDiv).contents().filter('.goog-toolbar').width(size.width);
		this.toolbarDiv.style.width = size.width;
	}
	
	
	if (this.editorDiv != null)
	{
		style=this.editorDiv.style;
		style.width = size.width;
		style.height = size.height;
	}	
};

atb.viewer.Editor.prototype.getWidth = function()
{
	return this.width;
};

atb.viewer.Editor.prototype.getHeight=function()
{
	return this.height;
};

atb.viewer.Editor.prototype.render=function()
{
	if (this.rootDiv != null)
	{
		return;
	}
	
    atb.viewer.Viewer.prototype.render.call(this);
	
	this.renderHelper_();

    this.syncTitle();//hack
    
    this.autoSaveIntervalObject = window.setInterval(
        atb.Util.scopeAsyncHandler(this.saveIfModified, this), 
        this.autoSaveInterval);

    var callBeforeUnload = function () {
        this.saveIfModified(true);
    };
    this.clientApp.registerFunctionToCallBeforeUnload(
        atb.Util.scopeAsyncHandler(callBeforeUnload, this));
    
    goog.events.listen(this.clientApp.getEventDispatcher(), 
                       atb.events.LinkingModeExited.EVENT_TYPE, 
                       this.handleLinkingModeExited, false, this);
};

atb.viewer.Editor.prototype.renderHelper_ = function () {
    var self = this;

	var style;

	this.baseDiv = this.domHelper.createElement("div");

	var thisWidth = "" + this.width + "px";// lolhack...!

	this.editorDiv = this.domHelper.createElement("div");
	this.editorDiv.id = this.useID;

	this.toolbarDiv = this.domHelper.createElement("div");
    
	this.rootDiv.appendChild(this.baseDiv);
	this.baseDiv.appendChild(this.toolbarDiv);
    
    this.renderPropertiesPane();
	
	this.baseDiv.appendChild(this.editorDiv);
	
	this.documentIcon = this.domHelper.createElement('div');
	jQuery(this.documentIcon).addClass('atb-viewer-documentIcon');
	
	goog.events.listen(this.documentIcon, goog.events.EventType.CLICK, this.handleDocumentIconClick_, false, this);
    
    var createButtonGenerator = atb.widgets.MenuUtil.createDefaultDomGenerator;
    var menuItems = [
        new atb.widgets.MenuItem(
                "showLinkedAnnos",
                createButtonGenerator("atb-radialmenu-button atb-radialmenu-button-show-linked-annos"),
                function(actionEvent) {
                    self.showAnnos(self.resourceId);
                }, 
                'Show resources linked to this document'
        ),
        new atb.widgets.MenuItem(
            "createLink",
            createButtonGenerator("atb-radialmenu-button atb-radialmenu-button-create-link"),
            function(actionEvent) {
                self.linkAnnotation();
            },
            'Link another resource to this document'
        ),
        new atb.widgets.MenuItem(
            "newTextAnno",
            createButtonGenerator("atb-radialmenu-button atb-radialmenu-button-new-text-anno"),
            function(actionEvent) {
                self.createNewTextBody(self.resourceId);
            },
            'Annotate this document'
        )
    ];
    this.addHoverMenuListenersToElement(this.documentIcon, menuItems,
                                        atb.Util.scopeAsyncHandler(function () {return this.resourceId;}, this));
	
	this.baseDiv.appendChild(this.documentIcon);
};

atb.viewer.Editor.prototype.renderPropertiesPane = function () {
    this.propertiesPaneDiv = this.domHelper.createDom('div');
    jQuery(this.propertiesPaneDiv).hide();
    
    this.rootDiv.appendChild(this.propertiesPaneDiv);
    
    this.propertiesPane = new atb.viewer.EditorPropertiesPane(this);
};

atb.viewer.Editor.prototype.finishRenderPropertiesPane = function () {
    this.propertiesPane.render(this.propertiesPaneDiv);
};

atb.viewer.Editor.prototype.updateAllPropertiesFromPane = function () {
    var properties = this.propertiesPane.getUnescapedProperties();
    
    this.setProperties(properties);
};

atb.viewer.Editor.prototype.updatePropertiesPaneContents = function () {
    var properties = {
        'purpose': this.purpose
    };
    
    this.propertiesPane.setProperties(properties);
};

atb.viewer.Editor.prototype.setProperties = function (properties) {
    if (properties.purpose) {
        this.setPurpose(properties.purpose);
    }
};

atb.viewer.Editor.prototype.showPropertiesPane = function () {
    this.updatePropertiesPaneContents();
    
    var self = this;
    jQuery(this.field.getElement()).fadeOut(300);
    jQuery(this.propertiesPaneDiv).fadeIn(300);
    jQuery(this.documentIcon).fadeOut(300);
    
    this.propertiesPanelVisible = true;
    
    this.propertiesButton.setChecked(true);
};

atb.viewer.Editor.prototype.hidePropertiesPane = function () {
    var self = this;
    jQuery(this.propertiesPaneDiv).fadeOut(300);
    jQuery(this.field.getElement()).fadeIn(300);
    jQuery(this.documentIcon).fadeIn(300);
    
    this.propertiesPanelVisible = false;
    
    this.updateAllPropertiesFromPane();
    
    this.propertiesButton.setChecked(false);
};

atb.viewer.Editor.prototype.handlePropertiesButtonClick_ = function (e) {
    if (this.propertiesPanelVisible) {
        this.hidePropertiesPane();
    }
    else {
        this.showPropertiesPane();
    }
};

atb.viewer.Editor.prototype.setPurpose = function (purpose) {
    this.purpose = purpose;
};

atb.viewer.Editor.prototype.handleDocumentIconClick_ = function (e) {
    e.stopPropagation();
    
    var eventDispatcher = this.clientApp.getEventDispatcher();
    var event = new atb.events.ResourceClicked(this.resourceId, null, this);
    eventDispatcher.dispatchEvent(event);
};

atb.viewer.Editor.prototype.finishRender=function()
{
    if (this.field == null) {
        this.field = new goog.editor.Field(this.useID, this.domHelper.getDocument());
		
        // Create and register all of the editing plugins you want to use.
        this.field.registerPlugin(new goog.editor.plugins.BasicTextFormatter());
        //this.field.registerPlugin(new goog.editor.plugins.RemoveFormatting());
        this.field.registerPlugin(new goog.editor.plugins.UndoRedo());
        this.field.registerPlugin(new goog.editor.plugins.ListTabHandler());
        this.field.registerPlugin(new goog.editor.plugins.SpacesTabHandler());
        this.field.registerPlugin(new goog.editor.plugins.EnterHandler());
        this.field.registerPlugin(new goog.editor.plugins.HeaderFormatter());
        var opt_initialTextContent = this._initialTextContent_;
		
        //this.field.registerPlugin(new goog.editor.plugins.LoremIpsum(this._initialTextContent_));
		
        this._initialTextContent_  = null;

        this.field.registerPlugin(new goog.editor.plugins.LinkDialogPlugin());
        this.field.registerPlugin(new goog.editor.plugins.LinkBubble());
        this.field.registerPlugin(new atb.viewer.TextEditorAnnotate(this));

        // Specify the buttons to add to the toolbar, using built in default buttons.
        var buttons = [
        goog.editor.Command.BOLD,
        goog.editor.Command.ITALIC,
        goog.editor.Command.UNDERLINE,
        //goog.editor.Command.FONT_COLOR,
        //goog.editor.Command.BACKGROUND_COLOR,
        //goog.editor.Command.FONT_FACE,
        goog.editor.Command.FONT_SIZE,
        goog.editor.Command.LINK,
        //goog.editor.Command.UNDO,
        //goog.editor.Command.REDO,
        goog.editor.Command.UNORDERED_LIST,
        goog.editor.Command.ORDERED_LIST//,
        //goog.editor.Command.INDENT,
        //goog.editor.Command.OUTDENT
        //goog.editor.Command.JUSTIFY_LEFT,
        //goog.editor.Command.JUSTIFY_CENTER,
        //goog.editor.Command.JUSTIFY_RIGHT,
        //goog.editor.Command.SUBSCRIPT,
        //goog.editor.Command.SUPERSCRIPT,
        //goog.editor.Command.STRIKE_THROUGH,
        //goog.editor.Command.REMOVE_FORMAT // Definitely don't offer this option, it would erase annotation spans
        ];

        var myToolbar = goog.ui.editor.DefaultToolbar.makeToolbar(buttons, this.domHelper.getElement(this.toolbarDiv));

        // Create annotate button
        // TODO: See if we can move this into the plugin instead of here
        var annotateButton = goog.ui.editor.ToolbarFactory.makeToggleButton(
            atb.viewer.TextEditorAnnotate.COMMAND.ADD_ANNOTATION,
            'Annotate selected text',
            '',
            'atb-editor-button-annotate');
		/*
		//lol@seems un-needed, and infact causes a redundant event, it would seem, from what i can tell:
        goog.events.listen(annotateButton, goog.ui.Component.EventType.ACTION, function (e) {
			//debugPrint("annotate command!");
            this.field.execCommand(atb.viewer.TextEditorAnnotate.COMMAND.ADD_ANNOTATION);
        }, false, this);
		*/
		annotateButton.queryable = true;//Fixes wierd annotations bug

        myToolbar.addChildAt(annotateButton, 0, true);
        
        this.propertiesButton = goog.ui.editor.ToolbarFactory.makeToggleButton(
            'properties',
            'Edit this document\'s properties',
            '',
            'atb-editor-button-properties'
        );
        goog.events.listen(this.propertiesButton, goog.ui.Component.EventType.ACTION, this.handlePropertiesButtonClick_, false, this);
        myToolbar.addChild(this.propertiesButton, true);

        // Hook the toolbar into the field.
        var myToolbarController = new goog.ui.editor.ToolbarController(this.field, myToolbar);
    }
	
    this.field.makeEditable();
	
	this.pasteHandler = new goog.events.PasteHandler(this.field);
        var self = this;
        this.field.addListener(goog.events.PasteHandler.EventType.PASTE, function(e)
        {
			window.setTimeout(function()
			{
				self.onTextPasted();
			},1);
        });
		
	
	
    this.editorIframeElement = this.domHelper.getElement(this.useID);
    this.editorIframe = goog.dom.getFrameContentWindow(this.editorIframeElement);
    this.addStylesheetToEditor(this.styleRoot + 'atb/editorframe.css');
    
    this.finishRenderPropertiesPane();
    
    this.addGlobalEventListeners();
};

atb.viewer.Editor.prototype.addGlobalEventListeners = function () {
    var eventDispatcher = this.clientApp.getEventDispatcher();
    
    this.unsavedChanges = false;
    goog.events.listen(this.field, goog.editor.Field.EventType.DELAYEDCHANGE, this.onChange, false, this);
    
//    goog.events.listen(eventDispatcher, 'resource modified', function (e) {
//                           if (e.getViewer() != this && e.getResourceId() == this.resourceId) {
//                                this.loadResource(e.getResource());
//                           }
//                       }, false, this);
    
    goog.events.listen(this.field, 'keydown', this.onKeyDown, false, this);
    
    goog.events.listen(this.editorIframe, 'mousemove', function (e) {
                       var offset = jQuery(this.editorIframeElement).offset();
                       
                       this.mousePosition.x = e.clientX + offset.left;
                       this.mousePosition.y = e.clientY + offset.top;
                       }, false, this);
    
    goog.events.listen(this.editorIframe, 'scroll', function (e) {
                       this.scrollTop = jQuery(this.editorIframe).scrollTop();
                       }, false, this);
};

atb.viewer.Editor.prototype.dismissContextMenu = function(menu)
{
	this.unselectAnnotationSpan();
	menu.hide();//lol!
};

atb.viewer.Editor.prototype.getTitle = function ()
{
    if (this._title == null)
	{
        return this.DEFAULT_DOCUMENT_TITLE;//'Untitled text document';
    }
    else
	{
        return this._title;
    }
};

atb.viewer.Editor.prototype.setTitle = function(title)
{
    this._title = title;
	this.syncTitle();
};

atb.viewer.Editor.prototype.isTitleEditable = function()
{
	return true;
};

atb.viewer.Editor.prototype.syncTitle = function()
{
	var myPanel = this.getCurrentPanelContainer();
	if (myPanel != null)
	{
		myPanel.setTitle(this.getTitle());
		myPanel.setTitleEditable(this.isTitleEditable());
	};
};

atb.viewer.Editor.prototype.loadResourceById =
function (resourceId, opt_doAfter, opt_doAfterScope) {
    this.showLoadingSpinner();
    
    this.webService.withResource(
        resourceId,
        function (text) {
            this.hideLoadingSpinner();
            
            this.loadResource(text);
            
            this.unsavedChanges = false;
            
            if (opt_doAfter) {
            	if (opt_doAfterScope) {
            		opt_doAfter.call(opt_doAfterScope);
            	}
            	else {
            		opt_doAfter.call(this);
            	}
            }
            this.crawler.crawl([resourceId], '', function () {}, this, null,
                               this.flashErrorIcon);
        },
        this,
        atb.Util.scopeAsyncHandler(this.flashErrorIcon, this)
    );
};

/**
 * @param resource {atb.resource.TextResource}
 */
atb.viewer.Editor.prototype.loadResource = function (resource) {
    this.textResource = resource;
    
    this.setHtml(resource.getContents());
    
    this.setTitle(resource.getTitle());
    this.resourceId = resource.getId();
    this.setPurpose(resource.getPurpose());
    
    if (resource.getAnnoIdsAsBody().length > 0) {
        this.annotationUid = resource.getAnnoIdsAsBody()[0];
    }
    
    var textEditorAnnotate = this.field.getPluginByClassId('Annotation');
    textEditorAnnotate.addListenersToAllHighlights();
    
    this.registerThumbnailToPanel();
};

atb.viewer.Editor.prototype.setAnnotationBody = function (bodyResourceId) {
    this.bodyResourceId = bodyResourceId;

    this.webService.withUid(
        function (uid) {
            this.annotationUid = uid;
        },
        this
    );
};


atb.viewer.Editor.prototype.getOtherPanelHelper = function()
{
	var otherPanel = null;
	var panelContainer = this.getCurrentPanelContainer();
	if (panelContainer != null)
	{
		var panelManager = panelContainer.getPanelManager();
		if (panelManager != null)
		{
			otherPanel = panelManager.getAnotherPanel(panelContainer);
		}
	}
	return otherPanel;
};

atb.viewer.Editor.prototype.showErrorMessage = function (msg) {
	var dialog = new atb.widgets.DialogWidget(
		{
			bModal: true,
			caption: "Error",
			content: ""+msg,
			show_buttons: [
				atb.widgets.DialogWidget.prototype.StandardButtonDefs.OkButton//,
				//this.StandardButtonDefs.CancelButton
			]
		}
	);
	dialog.show();
};

atb.viewer.Editor.prototype.onPaneLoaded = function () {
	this.syncTitle();
    var textEditorAnnotate = this.field.getPluginByClassId('Annotation');
    textEditorAnnotate.addListenersToAllHighlights();
};

atb.viewer.Editor.prototype.onTitleChanged = function (newTitle) {
    this._title = newTitle;
    this.onChange();
};

atb.viewer.Editor.prototype.onTitleChange = atb.viewer.Editor.prototype.onTitleChanged;

atb.viewer.Editor.prototype.DEFAULT_DOCUMENT_TITLE = 'Untitled text document';

atb.viewer.Editor.prototype.createNewTextBody = function (opt_myResourceId) {
	var myResourceId = opt_myResourceId || this.resourceId;
	
	var otherContainer = this.getOtherPanelHelper();
    if (otherContainer == null)
	{
		this.showErrorMessage("only one panel container!");
        return;
    }
    var annoBodyEditor = new atb.viewer.Editor(
		this.clientApp,
        ''
    );
    
    var targetTextTitle = this.getTitle();
    
    this.saveContents(
        function () {
        	this.webService.withUidList(
        		2,
        		function (uids) {
        			var newTextId = uids[0];
        			var annoId = uids[1];
        			
        			annoBodyEditor.resourceId = newTextId;
        			annoBodyEditor.annotationUid = annoId;
        			this.annotationUid = annoId;
        			
        			//annoBodyEditor.addAnnotationTarget(myResourceId);
        			annoBodyEditor.setTitle('New Annotation on ' + targetTextTitle);
        			annoBodyEditor.toggleIsAnnoText(true);
        			
        			this.setAnnotationBody(newTextId);
        			
        			annoBodyEditor.saveContents(function () {
        				this.webService.withSavedAnno(
							annoId,
							{
								'id': annoId,
								'type': 'anno',
								'anno': {
									'targets': [myResourceId],
									'bodies': [newTextId]
								}
							},
							function (response) {
								
							},
							this
						);
        			}, this);
        		},
        		this
        	);
        },
        this
    );

    otherContainer.setViewer( annoBodyEditor );

    this.toggleAnnotationMode(true);
};

atb.viewer.Editor.prototype.showAnnos = function (opt_myResourceId) {
	var id = opt_myResourceId || this.resourceId;

    var otherContainer = this.getOtherPanelHelper();

    var finder = new atb.viewer.Finder(this.clientApp, id);
    finder.setContextType(atb.viewer.Finder.ContextTypes.RESOURCE);

	otherContainer.setViewer(finder);
};

atb.viewer.Editor.prototype.linkAnnotation = function (opt_myResourceId, opt_myAnnoId) {
	var myResourceId = opt_myResourceId || this.resourceId;
	var myAnnoId = opt_myAnnoId || this.annotationUid;
	
	if (!myAnnoId) {
		this.webService.withUid(
			function (uid) {
				this.annotationUid = uid;
				this.linkAnnotation(myResourceId);
			},
			this
		);
		
		return; //This method will be called again when the server responds
	}
    
    this.highlightDocumentIcon();
	
	this.clientApp.createAnnoLink(this.resourceId, myAnnoId);
};

atb.viewer.Editor.prototype.toggleIsAnnoText = function (set_isAnnoText) {
	this.isAnnoText = set_isAnnoText;
};

atb.viewer.Editor.prototype.getIsAnnoText = function () {
	return this.isAnnoText;
};

/////////////////////////Filter Code:
atb.viewer.Editor.prototype.dumpTagSet_=function(toTag)//;
{
	//dumps a list of tags. possibly best done BEFORE the tag formatting rules, for the most info...
	var seenTags = new atb.util.Set();
	var visitor = function(tag)
	{
		var nodeName = tag.nodeName;
		if (seenTags.add(nodeName))
		{
			debugPrint(""+nodeName);
		}
		jQuery(tag).children().each(function()
		{
			visitor(this);
		});
	};
	//visitor(this.field.field);
	visitor(toTag);
};

atb.viewer.Editor.prototype.applyFormattingRules = function()
{
    
    //DISABLE----------------------
    //return;
    //-----------------------------
    
	//Todo: make a proper formatter helper-/implmentation class sometime, probably...
	var toTag = this.field.field;
	this.applyFormattingRulesRecursively_(toTag);
	
//	if (false)
//	{
//		this.dumpTagSet_(this.field.field);
//	}
};

atb.viewer.Editor.prototype.replaceTagKeepingContentsHelper_ = function(tag, withTag)
{
	//TODO: maybe check that withTag isn't related to tag meaningfully..?/badly...??
	jQuery(tag).contents().each(function()
	{
		withTag.appendChild(this);
	});
	var tagParent = tag.parentNode;
	if (tagParent != null)
	{
		tagParent.replaceChild(withTag, tag);
	}

};

atb.viewer.Editor.prototype._readStylePropsHelper_ = function(tag)
{
	var jqTag = jQuery(tag);
	var fontWeight = jqTag.css("font-weight");
	var textDecoration = jqTag.css("text-decoration");
	var fontStyle = jqTag.css("font-style");
	/*
	debugPrint("fontWeight: "+fontWeight);
	debugPrint("textDecoration: "+textDecoration);
	debugPrint("fontStyle: "+fontStyle);
	*/
	//debugPrint("fontWeight: "+fontWeight);
	/*
	fontWeight: 400
textDecoration: none
fontStyle: normal
fontWeight: bold
textDecoration: underline blink
fontStyle: italic
	//^lol@examples...lol!
	*/
	fontWeight = ("" + fontWeight).toLowerCase();
	textDecoration= ("" + textDecoration).toLowerCase();
	fontStyle= ("" + fontStyle).toLowerCase();
	var bBold = (fontWeight.indexOf("bold") != -1);
	//var bItalics = ((fontStyle.indexOf("italics") != -1) || (fontStyle.indexOf("oblique") != -1));
	//var bItalic = ((fontStyle.indexOf("italics") != -1) || (fontStyle.indexOf("oblique") != -1));
	var bItalic = ((fontStyle.indexOf("italic") != -1) || (fontStyle.indexOf("oblique") != -1));
	
	//oblique //hack
	var bUnderline = (textDecoration.indexOf("underline") != -1);
	return {
		bold: bBold,
		italics: bItalic,
		underline: bUnderline
	};
};

atb.viewer.Editor.prototype.applyFormattingRulesRecursively_ = function(toTag)
{
	//alert("!!!");
	//_readStylePropsHelper_(toTag);//lol!
	//this._readStylePropsHelper_(toTag);//lol!
	//or check computed style for boldness/etc...?
	
	

	//var jqContents = jQuery(toTag).contents();
	//debugViewObject(toTag);
	//if (t
	
	//a, ul, ol, li, p, br
	var allowedSet = new atb.util.Set();
	allowedSet.addAll(["a", "ul", "ol", "li", "p", "br"]);
	allowedSet.addAll(["b","i","u"]);//LOLforgot me's...
	allowedSet.addAll(["span", "body"]);//less sure about the specifics todo with these...!
//	allowedSet.addAll(["span", "body", "style"]);//less sure about the specifics todo with these...!
	//if (false)
	{
		//while this does "fix" the div problem, apparently we want to do this the "correct" (hopefully) way...
		allowedSet.add("div");//TEST HACK
	}
	
	var blockElementSet = new atb.util.Set();
	
	//blockElementSet.add("div");
	//blockElementSet.add("p");//not needed b/c we're still allowing p tags...!
	//blockElementSet.addAll("
	
	//allowedSet.addAll(["span", "body"]);//less sure about the specifics todo with these...!
	
	var self =this;
	var jqContents = jQuery(toTag).children();
	jqContents.each(function()
	{
		var childTag = this;
		
		var childTagName = childTag.nodeName;//or tagName...?
		childTagName=childTagName.toLowerCase();
		/*
		
		if (childTagName == "div")
		{
			//TODO: replace with tag + br...?
			
			//childTag.parentNode.replaceChild(
		}
		*/

		if (childTagName == "style")
		{
            childTag.innerHTML = "";
            return;
            
			//debugViewObject(childTag.childNodes, "style children");
			//^lol@fascinating use of 3 text nodes for the css text...lol!
			
			//debugPrint("style -- childNodes.length = "+childTag.childNodes.length);//lol@ 3 childnodes...???
			
			//debugPrint("style -- innerhtml = "+childTag.innerHTML);
			var str = "" + childTag.innerHTML;
			var matchFrag = "span.atb-ui-editor-textannotationatb-ui-editor-textannotation-id-";
			/////oklol://				 span.atb-ui-editor-textannotationatb-ui-editor-text
			var matchIndex = 0;
			var bChanged = false;
			var ret = "";
			var temp = "";
			var bSkipUntilClosingCurly = false;
			for(var i=0,l=str.length; i<l; i++)
			{
				var ch = str[i];
				if (bSkipUntilClosingCurly)
				{
					if (ch == "}")
					{
						bSkipUntilClosingCurly = false;
					}
					continue;
				}
				
				if (ch == matchFrag[matchIndex])
				{
					matchIndex++;
					temp += ch;
					//debugPrint("matchIndex: "+ matchIndex);
					if (matchIndex >= matchFrag.length)
					{
						bChanged = true;
						bSkipUntilClosingCurly = true;
						matchIndex = 0;
						temp = "";
						//debugPrint("!!!");
					}
				}
				else
				{
					ret+=temp;
					temp = "";
					
					matchIndex=0;
					ret += ch;
				}
				//span.atb-ui-editor-textannotationatb-ui-editor-textannotation-id-
			}
			if (bChanged)
			{
				childTag.innerHTML = ret;
				//continue;
				return;
			}
			
			//debugPrint("style -- innerhtml = "+childTag.innerHTML);
			return;
		}

		
		if (childTag.childNodes.length > 0)
		{
			self.applyFormattingRulesRecursively_(this);
		}
		//^lets do the recursion first... then the tag...lol!
		
		
		//TODO: check for bold/etc somewhere and add the proper tags if pertinent...?
		
		//maybe more cross-browser compatible...?:
		
		var childStyleAttribs = self._readStylePropsHelper_(childTag);//lol!
		//if (
		
		//this._readStylePropsHelper_(toTag);//lol!
		
		
		//jQuery(childTag).attr("style", "");
		
		var bSpan = (childTagName == "span");
		
		//var bBlockLevelElement = (blockElementSet.has(childTagHame));//hack
		//var bBlockLevelElement = (blockElementSet.has(childTagNSame));//hack
		//^LOLFAIL!
		var bBlockLevelElement = (blockElementSet.has(childTagName));//hack
		/*
		if (bBlockLevelElement)
		{
			//bBlockLevelElement
			debugPrint("bBlockLevelElement is true!!!");//reached
		}
		else
		{
			debugPrint("not a blocklevel element; tag: '"+childTagName+"'");
		}
		*/
		var bHasHighlightMarkerCssClass = false;
		
		//Node::classList looked promising, but, its html5 ish... =/
		var childClassList = childTag.className.split(/\s+/);
		var jqChildTag;
		jqChildTag = jQuery(childTag);
		
		var bHasRealAnnoClass = false;
		
		var hackSpanIdClass = null;
		//debugPrint("");//HACK
		for (var i=0, l = childClassList.length; i<l; i++)
		{
			var oneClassName = childClassList[i];
			if (bSpan)
			{
				//if (!bHasHighlightMarkerCssClass)
				{
					//bHasHighlightMarkerCssClass = (oneClassName.indexOf(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS) != -1);
					if ((oneClassName.indexOf(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS) != -1))
					{
						//debugPrint("oneClassName="+oneClassName);
						if (hackSpanIdClass==null)
						{
							hackSpanIdClass = [];
						}
						bHasHighlightMarkerCssClass = true;//lol!
						//if (bHasHighlightMarkerCssClass)
						{
							hackSpanIdClass.push(oneClassName);
							//hackSpanIdClass = oneClassName;//HACK we'll need this later...
						}
						
						if (
							(oneClassName.indexOf(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_ID)!=-1) || 
							(oneClassName.indexOf(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_LOCAL_ID)!=-1)
						){
							bHasRealAnnoClass=true;
							//debugPrint("bHasRealAnnoClass = true!");
							//bHasRealClass
						}
					}
				}//TODO: maybe warn if matched multiple times...??
					//if (hackSpanIdClass
			}
			jqChildTag.removeClass(oneClassName);//childClassList[i]);
		}
		if (!bHasRealAnnoClass)
		{
			//debugPrint("not a real anno anymore!");
			hackSpanIdClass = null;//kill the highlight if it lacks an id class!
		}
		//else
		//{
		//	debugPrint("a real anno!?");
		//}
		var newStyle ="";
		var bStyledChild = (childStyleAttribs.bold || childStyleAttribs.italics || childStyleAttribs.underline);
		
		if (childStyleAttribs.bold)
		{
			newStyle += "font-weight: bold; ";
		}
		if (childStyleAttribs.italics)
		{
			newStyle += "font-style: italic; ";
		}
		if (childStyleAttribs.underline)
		{
			newStyle += "text-decoration: underline; ";
		}
		//^LOLHACKX!
		//jQuery(childTag).attr("style", "");
		
		
		jQuery(childTag).removeAttr("align");//HACK
		
		if (newStyle == "")
		{
			jQuery(childTag).removeAttr("style");
		}
		else
		{
			jQuery(childTag).attr("style", newStyle);//lolhack!
		}
		
		
		
		if (hackSpanIdClass!=null)
		{
			for(var iclass=0,lclass=hackSpanIdClass.length; iclass<lclass; iclass++)
			{
				//jQuery(childTag).addClass(hackSpanIdClass);//HACK
				jQuery(childTag).addClass(hackSpanIdClass[iclass]);//HACK
			}
		}
		//if (
		//On the Cotton Map
		
		if ( (!allowedSet.has(childTagName)) || (bSpan && (!bHasHighlightMarkerCssClass)))
		{//Q: ^will the above still work if we have bold/etc on a span highlight...???
			//^Whitelist//						//^//if not a marker, then kill the span
			
			//debugPrint("unhandled tag name: "+childTagName);
			
			var parentNode = childTag.parentNode;
			var afterSibling = childTag.nextSibling;
			//var theCurrentChild = childTag;
			/*
			if (bBlockLevelElement)
			{
				bStyledChild=true;//HACK!!
			}
			*/
			if (bStyledChild)
			{
				var nds = [];
				
				
				if (childStyleAttribs.bold)
				{
					nds.push(this.domHelper.createElement("b"));
				}
				if (childStyleAttribs.italics)
				{
					nds.push(this.domHelper.createElement("i"));
				}
				if (childStyleAttribs.underline)
				{
					nds.push(this.domHelper.createElement("u"));
				}
				/*
				if (bBlockLevelElement)
				{
					//nds.push("p");//lol!
					nds.push(document.createElement("p"));
				}
				*/
				//if (if (bBlockLevelElement))
				
				
				var nd = nds[nds.length-1];
				var nd_tmp = nds[0];
				for (var ndi=1, ndl = nds.length; ndi<ndl; ndi++)
				{
					nd_tmp.appendChild(nds[ndi]);
					nd_tmp = nds[ndi];
				}
			
				jQuery(this).contents().each(function(){nd.appendChild(this)});
				
				
				parentNode.replaceChild(nds[0], childTag);//replace us
				//theCurrentChild=nds[0];
				
				childTag = nd;
				bSpan=false;
				debugPrint("styledchild!");
			}
			else
			{
				//Move children of this child into their grandparent, the current node...
				
				//debugPrint("NOT-styledchild!");
				debugPrint("NOT-styledchild! nodeName="+childTagName);
				//jQuery(this).contents().each(function(){toTag.appendChild(this)});
				var afterNode = childTag.nextSibling;
				
				jQuery(childTag).contents().each(
					function()
					{
						if (afterNode == null)
						{
							toTag.appendChild(this);
						}
						else
						{
							toTag.insertBefore(this, afterNode);
						}
						//toTag.appendChild(this);
					}
				);
				toTag.removeChild(childTag);
				//debugPrint("NOT-styledchild!");
				//return;
			}
			//lol@textalignment
			//bSpan = false;
			
			
			if (bBlockLevelElement)
			{
				//debugPrint("adding a br...");
				//if (false)
				
				//var beforeName = childTag.nodeName;//or tagName...?
				//childTagName=childTagName.toLowerCase();
		
				{
					debugPrint("adding a br...");
					var newBr = this.domHelpercreateElement("br");
					if (afterSibling == null)
					{
						//parentNode.appendChild(br);
						parentNode.appendChild(newBr);
					}
					else
					{
						parentNode.insertBefore(newBr, afterSibling);
					}
				}
			}
			/*if (bBlockLevelElement)
			{
				return;//HACK
			}*/
			
			if (!bStyledChild)
			{
				return;
			}
			
		}
		
		
		//childTag.setAttribute("style", "");//hack
		//handle special cases and remove dead tags:
		
		var bLineFeedTag = (childTagName=="br");
		
		
		
		//if a span, add back the marker classes/etc, if relevant.
		if (bSpan)
		{
			//Note: in order to remove style stuff above, we really probably want to remove the classes first, so we can't merge with the if-span parts above...!
			if (bHasHighlightMarkerCssClass)
			{
				/*
				jqChildTag.addClass(atb.resource.TextResource.ANNOTATION_MARKER_CLASS_NAME);
				jqChildTag.addClass(atb.viewer.TextEditorAnnotate.HIGHLIGHT_STYLING_CLASS);
				*/
				
				/*
				//sadly this stuff isn't present in this version..
				var resourceId = self.annotatePlugin.span2LocalId(childTag);
				
				//check if it was selected:
				if (self.isSelectedSpanId(resourceId))//todo: rename those methods to be better/more clearly named...!
				{
					jqChildTag.addClass(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_SELECTED);
				}
				
				//check if it was being hovered over:
				if (self.isHoverSpanId(resourceId))
				{
					jqChildTag.addClass(atb.viewer.TextEditorAnnotate.ANNOTATION_CLASS_HOVER);
				}
				*/
			}
			/*
			else
			{
				//if not a marker, then kill the span:
				
				//Move children of this child into their grandparent, the current node...
				//debugPrint("non-marker-span: "+childTag.innerHTML);
				jQuery(this).contents().each(function(){toTag.appendChild(this)});
			}
			*/
		}
		
		//kill empty tags, except, <BR>:
		if (!bLineFeedTag)
		{
			if (childTag.childNodes.length < 1)
			{
				//debugPrint("removing empty tag: '"+childTagName+"'");
				debugPrint("empty tag!");
				if (childTag.parentNode != null)
				{
					childTag.parentNode.removeChild(childTag);
				}
				else
				{
					debugViewObject(childTag,"warning null parentNode!");
				}
			}
		}
	});
};

atb.viewer.Editor.prototype.getPositionOfFieldChildElement = function (element) {
	var elementPosition = jQuery(element).offset();
	var xCoord = elementPosition.left;
	var yCoord = elementPosition.top;

	//traverse field's parents' position:
	var domHelper = this.domHelper;
	var fieldIframe = domHelper.getDocument().getElementById(this.useID);
	var framePosition = jQuery(fieldIframe).offset();
    var scrollTop = jQuery(fieldIframe.contentDocument).scrollTop();
	xCoord += framePosition.left;
	yCoord += framePosition.top - scrollTop;
	
	return {
		x: xCoord,
		y: yCoord
	};
};

atb.viewer.Editor.prototype.hasUnsavedChanges = function () {
    return !! this.unsavedChanges;
};

atb.viewer.Editor.prototype.onChange = function (event) {
    this.unsavedChanges = true;
    
    this.timeOfLastChange = goog.now();
};

atb.viewer.Editor.prototype.onKeyDown = function (event) {
    console.log(event);
};

atb.viewer.Editor.prototype.saveDelayAfterLastChange = 2.5 * 1000;

atb.viewer.Editor.prototype.saveIfModified = function (opt_synchronously) {
    var isNotStillTyping = goog.isNumber(this.timeOfLastChange) &&
        (goog.now() - this.timeOfLastChange) > this.saveDelayAfterLastChange;
    
    if (this.hasUnsavedChanges() && isNotStillTyping) {
        this.saveContents(null, null, opt_synchronously);
    }
};

atb.viewer.Editor.prototype.viewerHasEnteredBackground = function (event) {
    atb.viewer.Viewer.prototype.viewerHasEnteredBackground.apply(this, arguments);
    if (this.field != null && !this.field.isUneditable()) {
		this.field.makeUneditable();
	}
};

atb.viewer.Editor.prototype.handleLinkingModeExited = function (event) {
    var highlightPlugin = this.field.getPluginByClassId('Annotation');
    var anno = event.getResource();
    
    if (! anno) {
        highlightPlugin.unselectAnnotationSpan();
        this.unHighlightDocumentIcon();
        return;
    }
    
    var bodiesAndTargets = anno.getChildIds();
    
    goog.array.forEach(bodiesAndTargets, function (id) {
                           try {
                               var tag = highlightPlugin.getAnnotationTagByResourceId(id);
                               if (tag) {
                                   highlightPlugin.flashSpanHighlight(tag);
                               }
                           } catch (error) {}
                           if (id == this.resourceId) {
                               this.flashDocumentIconHighlight();
                           }
                       }, this);
};

atb.viewer.Editor.prototype.generateViewerThumbnail = function () {
    return new atb.viewer.TextThumbnail(this);
};

atb.viewer.Editor.prototype.getResource = function () {
    return this.textResource;
};