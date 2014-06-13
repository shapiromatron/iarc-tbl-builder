// References -- {_id: String,
//                user_id: String,
//                tblType: String,
//                name: String,
//                passwd: String,
//                timestamp: Number}
MyTbls = new Meteor.Collection('myTbls');

// Publish all items for requested list_id.
Meteor.publish('myTbls', function (user_id) {
    check(user_id, String);
    return MyTbls.find({user_id: user_id});
});


// References -- {citation: String,
//                timestamp: Number}
Refs = new Meteor.Collection("refs");

// Publish all items for requested list_id.
Meteor.publish('refs', function () {
  return Refs.find();
});


// RelRisks   -- {ref_id: String,
//                low: String,
//                mid: Number,
//                high: Number,
//                timestamp: Number}
RelRisks = new Meteor.Collection("relRisks");

// Publish all items for requested list_id.
Meteor.publish('relRisks', function () {
  return RelRisks.find();
});

Meteor.publish('relRisksRef', function (ref_id) {
    check(ref_id, String);
    return RelRisks.find({ref_id: ref_id});
});


/* EpiCohort:
{
    "_id" : String (id),
    "comments" : String,
    "covariates" : String,
    "exposureAssessment" : String,
    "followUpPeriod" : String,
    "location" : String,
    "myTbl_id" : String (id),
    "numSubjects" : Number,
    "numSubjectsText" : String,
    "reference" : String,
    "reference_url" : String (URL),
    "timestamp" : Date,
    "user_id" :  String (id)
}
*/
EpiCohort = new Meteor.Collection("epiCohort");

Meteor.publish('epiCohort', function (myTbl_id) {
    check(myTbl_id, String);
    return EpiCohort.find({myTbl_id: myTbl_id});
});

/* EpiCohortExposure:
{
    "organSite" : String,
    "exposureCategories" : String,
    "exposedCases" : String,
    "riskMid" : Number,
    "riskLow" : Number,
    "riskHigh" : Number,
    "estimated" : Boolean,
    "timestamp" : Date,
    "user_id" : String (id),
    "epiCohort_id" : String (id),
    "myTbl_id" : String (id),
    "_id" : String (id),
}
*/

EpiCohortExposure = new Meteor.Collection("epiCohortExposure");

Meteor.publish('epiCohortExposure', function (myTbl_id) {
    check(myTbl_id, String);
    return EpiCohortExposure.find({myTbl_id: myTbl_id});
});
