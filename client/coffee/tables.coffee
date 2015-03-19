Users = new Meteor.Collection('userLookup');

getTablesHandle = ->
    tablesId = Session.get('tablesEditingId')
    if tablesId
        userHandle = Meteor.subscribe('tblUsers', tablesId)
    else
        userHandle = null

userHandle = getTablesHandle()
Tracker.autorun(getTablesHandle)


# TABLES MAIN ------------------------------------------------------------------
Template.home.helpers

    currentUser2: ->
        # create new reactive-source since users report update not occurring
        return Meteor.user()


Template.home.rendered = ->
    Session.set("tablesShowNew", false)
    Session.set("tablesEditingId", null)
    Session.set("reorderRows", false)


# TABLES -----------------------------------------------------------------------
Template.TablesByMonograph.helpers

    getMonographs: ->
        tbls = Tables.find({},{fields: {"volumeNumber": 1}, sort: {"volumeNumber": -1}}).fetch()
        return _.uniq(_.pluck(tbls, "volumeNumber"))

    getMonographAgents: (volumeNumber) ->
        tbls = Tables.find({"volumeNumber": volumeNumber},
                           {fields: {"monographAgent": 1}, sort: {"monographAgent": 1}}).fetch()
        return _.uniq(_.pluck(tbls, "monographAgent"))

    getTables: (volumeNumber, monographAgent) ->
        tbls = Tables.find({"volumeNumber": volumeNumber, "monographAgent": monographAgent},
                           sort: {"sortIdx": 1}).fetch()
        return tbls

    getURL: () ->
        switch @tblType
            when "Mechanistic Evidence Summary"
                url = Router.path('mechanisticMain', {_id: @_id})
            when "Epidemiology Evidence"
                url = Router.path('epiMain', {_id: @_id})
            when "Exposure Evidence"
                url = Router.path('exposureMain', {_id: @_id})
            when "Animal Bioassay Evidence"
                url = Router.path('animalMain', {_id: @_id})
            when "Genetic and Related Effects"
                url = Router.path('genotoxMain', {_id: @_id})
            else
                url = Router.path('404')

    canEdit: ->
        currentUser = Meteor.user()
        if currentUser then id = currentUser._id else return
        if "superuser" in currentUser.roles then return true
        ids = (v.user_id for v in @.user_roles when v.role is "projectManagers")
        return((id is @.user_id) or (id in ids))

    showNew: () ->
        Session.get("tablesShowNew")

    isEditing: () ->
        Session.equals('tablesEditingId', @_id)


Template.TablesByMonograph.events
    'click #tables-show-create': (evt, tmpl) ->
        Session.set("tablesShowNew", true)
        Tracker.flush()  # update DOM before focus
        share.activateInput(tmpl.find("input[name=volumeNumber]"))

    'click #tables-show-edit': (evt, tmpl) ->
        Session.set("tablesEditingId", this._id)
        Tracker.flush()  # update DOM before focus
        share.activateInput(tmpl.find("input[name=volumeNumber]"))

    'click #agentEpiReport': (evt, tmpl) ->
        val = $(evt.target).data()
        val.multiTable = true
        div = tmpl.find('#modalHolder')
        Blaze.renderWithData(Template.reportTemplateModal, val, div)

    'click #reorderRows': (evt, tmpl) ->
        isReorder = not Session.get('reorderRows')
        Session.set('reorderRows', isReorder)
        if isReorder
            tmpl.sortables = []
            $('.sortables').each (i,v) ->
                tmpl.sortables.push(
                    new Sortable(v,
                        handle: ".moveTableHandle",
                        onUpdate: share.moveRowCheck,
                        Cls: Tables))
        else
            tmpl.sortables.forEach((v) -> v.destroy())
        share.toggleRowVisibilty(isReorder, $('.moveTableHandle'))


# TABLES FORM ------------------------------------------------------------------
Template.tablesForm.helpers
    searchUsers: (query, callback) ->
        Meteor.call 'searchUsers', query, {}, (err, res) ->
            if err then return console.log(err)
            callback(res)

    getUsers: (userType) ->
        ids = (v.user_id for v in @user_roles when v.role is userType)
        ul = $(".#{userType}")

    getRoledUsers: (userType) ->
        if @.user_roles
            ids = (v.user_id for v in @.user_roles when v.role is userType)
            Meteor.users.find({_id: {$in: ids}})

    getTblTypeOptions: ->
        return tblTypeOptions


Template.tablesForm.events
    'click #tables-create': (evt, tmpl) ->
        obj = share.newValues(tmpl.find("#tablesForm"))
        obj['user_roles'] = getUserPermissionsObject(tmpl);
        delete obj['projectManagers']
        delete obj['teamMembers']
        delete obj['reviewers']
        isValid = Tables.simpleSchema().namedContext().validate(obj)
        if isValid
            Tables.insert(obj)
            Session.set("tablesShowNew", false)
        else
            errorDiv = share.createErrorDiv(Tables.simpleSchema().namedContext())
            $(tmpl.find("#errors")).html(errorDiv)

    'click #tables-create-cancel': (evt, tmpl) ->
        Session.set("tablesShowNew", false)

    'click #tables-update': (evt, tmpl) ->
        vals = share.updateValues(tmpl.find("#tablesForm"), this);
        vals['user_roles'] = getUserPermissionsObject(tmpl);
        delete vals['projectManagers']
        delete vals['teamMembers']
        delete vals['reviewers']
        modifier = {$set: vals}
        isValid = Tables.simpleSchema().namedContext().validate(modifier, {modifier: true})
        if isValid
            Tables.update(this._id, modifier)
            Session.set("tablesEditingId", null)
        else
            errorDiv = share.createErrorDiv(Tables.simpleSchema().namedContext())
            $(tmpl.find("#errors")).html(errorDiv)

    'click #tables-update-cancel': (evt, tmpl) ->
        Session.set("tablesEditingId", null)

    'click #tables-delete': (evt, tmpl) ->
        Tables.remove(this._id)
        Session.set("tablesEditingId", null)

    'click .removeUser': (evt, tmpl) ->
        $(evt.currentTarget).parent().remove()

    'typeahead:selected .userTypeahead': (evt, tmpl, v) ->
        $ul = $(tmpl.find(".#{evt.target.name}"))
        ids = ($(li).data('user_id') for li in $ul.find('li'))
        if v._id not in ids
            Blaze.renderWithData(Template.UserLI, v, $ul[0])

Template.tablesForm.rendered = ->
    Meteor.typeahead.inject('.userTypeahead')

getUserPermissionsObject = (tmpl)->
    # first filter objects so that each user has the higher permission
    permissions = {}
    for role in ['reviewers', 'teamMembers', 'projectManagers']
        ids = ($(li).data('user_id') for li in tmpl.findAll(".#{role} li"))
        permissions[id] = role for id in ids
    # now save as list of objects
    list = ({user_id: key, role: value} for key, value of permissions)
    return list
