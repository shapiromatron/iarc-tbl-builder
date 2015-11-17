serverShared = {
    isStaffOrHigher: function(userId) {
        var validStaff = ['staff', 'superuser'],
            userRoles = Roles.getRolesForUser(userId);
        return _.intersection(validStaff, userRoles).length > 0;
    },
    getWordTemplatePath: function(fn) {
        return Meteor.settings.docx_template_path + "/" + fn;
    }
};
