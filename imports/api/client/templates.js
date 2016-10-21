import { Meteor } from 'meteor/meteor';
import { Blaze } from 'meteor/blaze';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Tracker } from 'meteor/tracker';

import _ from 'underscore';

import tblBuilderCollections from '/imports/collections';
import {
    createErrorDiv,
    activateInput,
    updateValues,
    toggleQA,
    getNextSortIdx,
} from '/imports/api/client/utilities';
import {
    newValues,
} from '/imports/api/utilities';


Session.setDefault('windowScrollX', 0);
Session.setDefault('windowScrollY', 0);


let getScrollPosition = function(){
        Session.set('windowScrollX', window.scrollX);
        Session.set('windowScrollY', window.scrollY);
    },
    setScrollPosition = function(){
        window.scrollTo(
            Session.get('windowScrollX'),
            Session.get('windowScrollY')
        );
    },
    cloneObject = function(oldObj, Collection, NestedCollection) {
        var newObj, new_parent_id, ref, newNest;

        // clone object
        newObj = _.extend({}, oldObj);
        delete newObj._id;

        // increment sort-index
        if (newObj.sortIdx){
            newObj.sortIdx = getNextSortIdx(newObj.sortIdx, Collection);
        }

        // insert, getting new parent-ID
        new_parent_id = Collection.insert(newObj);

        // clone nested collection, if exists
        if (NestedCollection != null) {
            ref = NestedCollection.find({parent_id: oldObj._id}).fetch();
            _.each(ref, function(oldNest){
                newNest = _.extend({}, oldNest);
                delete newNest._id;
                newNest.parent_id = new_parent_id;
                return NestedCollection.insert(newNest);
            });
        }
    },
    createNewNestedModal = function(evt, tmpl) {
        var div = document.getElementById('modalHolder'),
            key = Session.get('evidenceType'),
            NestedTemplate = tblBuilderCollections.evidenceLookup[key].nested_template;
        $(div).empty();
        getScrollPosition();
        Blaze.renderWithData(NestedTemplate, {parent: this}, div);
    },
    isCtrlClick = function(evt){
        return evt.ctrlKey || evt.altKey || evt.metaKey;
    },
    animateClick = function(el){
        $(el)
          .one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend',
              function(){$(el).removeClass('animated rubberBand');})
          .addClass('animated rubberBand');
    },
    removeNestedFormModal = function(tmpl, options) {
        $('#modalDiv')
            .one('hide.bs.modal', function() {
                var key = Session.get('evidenceType'),
                    NestedCollection = tblBuilderCollections.evidenceLookup[key].nested_collection;
                $(tmpl.view._domrange.members).remove();
                Blaze.remove(tmpl.view);
                if ((options != null) && (options.remove != null)) {
                    NestedCollection.remove(options.remove);
                }
                setScrollPosition();
            })
            .modal('hide');
    },
    saveSortOrder = function(objs){
        var key = Session.get('evidenceType'),
            ids = _.map(objs, function(d){ return d._id; });
        return Meteor.call('saveSortOrder', key, ids, function(err, response) {
            if (response) {
                console.log(response);
            } else {
                alert('An error occurred.');
            }
        });
    },
    applySortsAndFilters = function(objs, sfs){
        sfs = sfs || {};
        var i,
            sort, lastAsc, fn,
            sorts = sfs.sorts || [],
            filters = sfs.filters || [],
            key = Session.get('evidenceType'),
            Collection = tblBuilderCollections.evidenceLookup[key].collection,
            cw_fn = Collection.sortFields,
            isAscending = function(sort){return (sort.order === 'Ascending');};

        if(sorts.length>0){

            // set sort ascending/descending.
            sorts[0].isAscending = (isAscending(sorts[0]));
            lastAsc = sorts[0].isAscending;
            for (i=1; i<sorts.length; i++){
                sort = sorts[i];
                if (isAscending(sort) === true){
                    sort.isAscending = lastAsc;
                } else {
                    sort.isAscending = !lastAsc;
                    lastAsc = !lastAsc;
                }
            }

            // apply sort
            for (i=sorts.length-1; i>=0; i--){
                sort = sorts[i];
                fn = cw_fn[sort.field];
                objs = fn(objs, sort.isAscending);
            }
        }

        if(filters.length>0){
          // todo
        }

        return objs;
    };


export {cloneObject};

export const abstractMainHelpers = {};


export const abstractTblHelpers = {
    showNew: function() {
        return Session.get('evidenceShowNew');
    },
    isEditing: function() {
        return Session.equals('evidenceEditingId', this._id);
    },
    showRow: function(isHidden) {
        return Session.get('evidenceShowAll') || !isHidden;
    },
    object_list: function() {
        var key = Session.get('evidenceType'),
            sfs = Session.get('sortsAndFilters') || {},
            objs = null,
            Collection;

        if (key != null) {
            Collection = tblBuilderCollections.evidenceLookup[key].collection,
            objs = Collection.find({}, {sort: {sortIdx: 1}}).fetch();
            objs = applySortsAndFilters(objs, sfs);
            if (sfs.save) {
                Session.set('sortsAndFilters', _.extend(sfs, {'save': false}));
                saveSortOrder(objs);
            }
        }
        return objs;
    },
};


export const abstractRowHelpers = {
    getChildren: function() {
        var key = Session.get('evidenceType'),
            NestedCollection = tblBuilderCollections.evidenceLookup[key].nested_collection;
        return NestedCollection.find({parent_id: this._id}, {sort: {sortIdx: 1}});
    },
};


let toggleEdit = function(_id){
    getScrollPosition();
    Session.set('evidenceEditingId', _id);
    Tracker.flush();
    activateInput($('input[name=referenceID]')[0]);
};

export const abstractRowEvents = {
    'click #show-edit': function(evt, tmpl) {
        toggleEdit(this._id);
    },
    'click #toggle-hidden': function(evt, tmpl) {
        var key = Session.get('evidenceType'),
            Collection = tblBuilderCollections.evidenceLookup[key].collection;
        Collection.update(this._id, {$set: {isHidden: !this.isHidden}});
    },
    'click .add-nested': createNewNestedModal,
    'click #move-content': function(evt, tmpl) {
        var div = document.getElementById('modalHolder');
        $(div).empty();
        Blaze.renderWithData(Template.moveModal, {content: this}, div);
    },
    'click #clone-content': function(evt, tmpl) {
        var ET = tblBuilderCollections.evidenceLookup[Session.get('evidenceType')];
        cloneObject(this, ET.collection, ET.nested_collection);
    },
    'click .quickEdit': function(evt, tmpl){
        if (evt.shiftKey) {
            toggleEdit(this._id);
        }
    },
};


export const abstractFormEvents = {
    'closeForm': function(evt, tmpl){
        setScrollPosition();
    },
    'click #create-cancel': function(evt, tmpl) {
        Session.set('evidenceShowNew', false);
         $(tmpl.firstNode).trigger('closeForm');
    },
    'click #update-cancel': function(evt, tmpl) {
        Session.set('evidenceEditingId', null);
        $(tmpl.firstNode).trigger('closeForm');
    },
    'click #create': function(evt, tmpl) {
        var errorDiv, isValid,
            key = Session.get('evidenceType'),
            Collection = tblBuilderCollections.evidenceLookup[key].collection,
            obj = newValues(tmpl.find('#mainForm')),
            createPreValidate = tmpl.view.template.__helpers[' createPreValidate'];

        _.extend(obj, {
            tbl_id: Session.get('Tbl')._id,
        });
        if (Collection.preSaveHook){
            Collection.preSaveHook(tmpl, obj);
        }

        if (createPreValidate) obj = createPreValidate(tmpl, obj, this);
        isValid = Collection.simpleSchema().namedContext().validate(obj);
        if (isValid) {
            Collection.insert(obj);
            Session.set('evidenceShowNew', false);
            $(tmpl.firstNode).trigger('closeForm');
        } else {
            errorDiv = createErrorDiv(Collection.simpleSchema().namedContext());
            $(tmpl.find('#errors')).html(errorDiv);
        }
    },
    'click #update': function(evt, tmpl) {
        var errorDiv, fld, i, isValid, modifier, updatePreValidate,
            key = Session.get('evidenceType'),
            Collection = tblBuilderCollections.evidenceLookup[key].collection,
            vals = updateValues(tmpl.find('#mainForm'), this),
            ref = tblBuilderCollections.evidenceLookup[key].requiredUpdateFields;

        if (Collection.preSaveHook){
            Collection.preSaveHook(tmpl, vals);
        }

        for (i = 0; i < ref.length; i++) {
            fld = ref[i];
            vals[fld] = tmpl.find(`select[name="${fld}"]`).value;
        }

        updatePreValidate = tmpl.view.template.__helpers[' updatePreValidate'];

        if (updatePreValidate != null){
            vals = updatePreValidate(tmpl, vals, this);
        }

        modifier = {$set: vals};
        isValid = Collection
            .simpleSchema()
            .namedContext()
            .validate(modifier, {modifier: true});
        if (isValid) {
            Collection.update(this._id, {$set: vals});
            (isCtrlClick(evt)) ? animateClick(evt.target) : Session.set('evidenceEditingId', null);
            $(tmpl.firstNode).trigger('closeForm');
        } else {
            errorDiv = createErrorDiv(Collection.simpleSchema().namedContext());
            $(tmpl.find('#errors')).html(errorDiv);
        }
    },
    'click #delete': function(evt, tmpl) {
        var key = Session.get('evidenceType'),
            Collection = tblBuilderCollections.evidenceLookup[key].collection;
        Collection.remove(this._id);
        Session.set('evidenceEditingId', null);
        $(tmpl.firstNode).trigger('closeForm');
    },
    'click #setQA,#unsetQA': function(evt, tmpl) {
        var key = Session.get('evidenceType'),
            collection_name = tblBuilderCollections.evidenceLookup[key].collection_name;
        Meteor.call('adminToggleQAd', this._id, collection_name, function(err, response) {
            if (response){
                toggleQA(tmpl, response.QAd);
                Session.set('evidenceEditingId', null);
                $(tmpl.firstNode).trigger('closeForm');
            }
        });
    },
    'click #addNestedResult': createNewNestedModal,
};


export const abstractNestedTableHelpers = {
    showRow: function(isHidden) {
        return Session.get('evidenceShowAll') || !isHidden;
    },
};


let toggleInnerEdit = function(_id){
    let div = document.getElementById('modalHolder'),
        key = Session.get('evidenceType'),
        NestedTemplate = tblBuilderCollections.evidenceLookup[key].nested_template;

    getScrollPosition();
    Session.set('nestedEvidenceEditingId', _id);
    Blaze.renderWithData(NestedTemplate, {}, div);
};

export const abstractNestedTableEvents = {
    'click #inner-show-edit': function(evt, tmpl) {
        toggleInnerEdit(tmpl.data._id);
    },
    'click #inner-toggle-hidden': function(evt, tmpl) {
        var key = Session.get('evidenceType'),
            NestedCollection = tblBuilderCollections.evidenceLookup[key].nested_collection,
            data = tmpl.view.parentView.dataVar.curValue;

        NestedCollection.update(data._id, {$set: {isHidden: !data.isHidden}});
    },
    'click #clone-nested-content': function(evt, tmpl) {
        var data = tmpl.view.parentView.dataVar.curValue,
            ET = tblBuilderCollections.evidenceLookup[Session.get('evidenceType')];
        return cloneObject(data, ET.nested_collection);
    },
    'click .quickEdit': function(evt, tmpl){
        if (evt.shiftKey) {
            toggleInnerEdit(tmpl.data._id);
        }
    },
};


export const abstractNestedFormHelpers = {
    isNew: function() {
        return Session.get('nestedEvidenceEditingId') === null;
    },
    getObject: function() {
        var initial = this,
            key = Session.get('evidenceType'),
            NestedCollection = tblBuilderCollections.evidenceLookup[key].nested_collection,
            existing = NestedCollection.findOne({_id: Session.get('nestedEvidenceEditingId')});
        return existing || initial;
    },
};


export const abstractNestedFormEvents = {
    'click #inner-create': function(evt, tmpl) {
        var errorDiv, isValid,
            key = Session.get('evidenceType'),
            NestedCollection = tblBuilderCollections.evidenceLookup[key].nested_collection,
            obj = newValues(tmpl.find('#nestedModalForm'));

        _.extend(obj, {
            tbl_id: Session.get('Tbl')._id,
            parent_id: tmpl.data.parent._id,
            isHidden: false,
        });
        NestedCollection.preSaveHook(tmpl, obj);

        isValid = NestedCollection
            .simpleSchema()
            .namedContext()
            .validate(obj);

        if (isValid) {
            NestedCollection.insert(obj);
            removeNestedFormModal(tmpl);
        } else {
            errorDiv = createErrorDiv(NestedCollection.simpleSchema().namedContext());
            $(tmpl.find('#errors')).html(errorDiv);
        }
    },
    'click #inner-create-cancel': function(evt, tmpl) {
        removeNestedFormModal(tmpl);
    },
    'click #inner-update': function(evt, tmpl) {
        var errorDiv, modifier, isValid,
            key = Session.get('evidenceType'),
            NestedCollection = tblBuilderCollections.evidenceLookup[key].nested_collection,
            vals = updateValues(tmpl.find('#nestedModalForm'), this);

        NestedCollection.preSaveHook(tmpl, vals);

        modifier = {$set: vals},
        isValid = NestedCollection
            .simpleSchema()
            .namedContext()
            .validate(modifier, {modifier: true});

        if (isValid) {
            NestedCollection.update(this._id, modifier);
            if (isCtrlClick(evt)){
                animateClick(evt.target);
            } else {
                Session.set('nestedEvidenceEditingId', null);
                removeNestedFormModal(tmpl);
            }
        } else {
            errorDiv = createErrorDiv(NestedCollection.simpleSchema().namedContext());
            $(tmpl.find('#errors')).html(errorDiv);
        }
    },
    'click #inner-update-cancel': function(evt, tmpl) {
        Session.set('nestedEvidenceEditingId', null);
        removeNestedFormModal(tmpl);
    },
    'click #inner-delete': function(evt, tmpl) {
        Session.set('nestedEvidenceEditingId', null);
        removeNestedFormModal(tmpl, {'remove': this._id});
    },
    'click #setQA,#unsetQA': function(evt, tmpl) {
        var key = Session.get('evidenceType'),
            nested_collection_name = tblBuilderCollections.evidenceLookup[key].nested_collection_name;
        Meteor.call('adminToggleQAd', this._id, nested_collection_name, function(err, response) {
            if (response){
                toggleQA(tmpl, response.QAd);
                Session.set('nestedEvidenceEditingId', null);
                removeNestedFormModal(tmpl);
            }
        });
    },
};
