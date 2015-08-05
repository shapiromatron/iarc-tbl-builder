Template.referencesTbl.helpers({
  referenceShowNew: function() {
    return Session.get("referenceShowNew");
  },
  getReferences: function() {
    return Reference.find({}, {sort: [["name", 1]]});
  },
  referenceIsEditing: function() {
    return Session.equals('referenceEditingId', this._id);
  }
});
Template.referencesTbl.events({
  'click #reference-show-create': function(evt, tmpl) {
    Session.set("referenceShowNew", true);
    Tracker.flush();
    clientShared.activateInput(tmpl.find("input[name=name]"));
  },
  'click #reference-show-edit': function(evt, tmpl) {
    Session.set("referenceEditingId", this._id);
    Tracker.flush();
    clientShared.activateInput(tmpl.find("input[name=name]"));
  },
  'click #reference-downloadExcel': function(evt, tmpl) {
    var volumeNumber = Session.get('monographAgent');
    Meteor.call('referenceExcelDownload', volumeNumber, function(err, response) {
      clientShared.returnExcelFile(response, "references.xlsx");
    });
  }
});


var toggleFieldDisplays = function(tmpl) {
  var showPubMed = tmpl.find('select[name=referenceType] option:selected').text === "PubMed";
  if (showPubMed) {
    $('#pubMedFields').show();
    $('#otherFields').hide();
  } else {
    $('#pubMedFields').hide();
    $('#otherFields').show();
  }
};
Template.referenceForm.helpers({
  getReferenceTypeOptions: function() {
    return Reference.typeOptions;
  }
});
Template.referenceForm.events({
  'click #reference-create': function(evt, tmpl) {
    var errorDiv, isValid, obj, ref_id;
    obj = clientShared.newValues(tmpl.find('#referenceForm'));
    obj['monographAgent'] = [Session.get('monographAgent')];
    isValid = Reference.simpleSchema().namedContext().validate(obj);
    if (isValid) {
      ref_id = Reference.insert(obj);
      Session.set("referenceShowNew", false);
      return Session.set("referenceNewObj", ref_id);
    } else {
      errorDiv = clientShared.createErrorDiv(Reference.simpleSchema().namedContext());
      return $(tmpl.find("#errors")).html(errorDiv);
    }
  },
  'click #reference-create-cancel': function(evt, tmpl) {
    return Session.set("referenceShowNew", false);
  },
  'click #reference-update': function(evt, tmpl) {
    var vals = clientShared.updateValues(tmpl.find('#referenceForm'), this),
        modifier = {$set: vals},
        isValid = Reference
          .simpleSchema()
          .namedContext()
          .validate(modifier, {modifier: true}),
        errorDiv;

    if (isValid) {
      Reference.update(this._id, modifier);
      Session.set("referenceEditingId", null);
    } else {
      errorDiv = clientShared.createErrorDiv(Reference.simpleSchema().namedContext());
      $(tmpl.find("#errors")).html(errorDiv);
    }
  },
  'click #reference-update-cancel': function(evt, tmpl) {
    return Session.set("referenceEditingId", null);
  },
  'click #reference-delete': function(evt, tmpl) {
    Reference.remove(this._id);
    return Session.set("referenceEditingId", null);
  },
  'click .pubmedLookup': function(evt, tmpl) {
    var spinner = $(tmpl.find('.pubmedLookupSpinner')),
        pubmedID = tmpl.find('input[name=pubmedID]').value,
        citation = tmpl.find('textarea[name=fullCitation]'),
        name = tmpl.find('input[name=name]');

    spinner.toggleClass('spinner-active');
    return getPubMedDetails(pubmedID, function(v) {
      spinner.toggleClass('spinner-active');
      citation.value = v.fullCitation;
      name.value = v.shortCitation;
    });
  },
  'change select[name=referenceType]': function(evt, tmpl) {
    return toggleFieldDisplays(tmpl);
  }
});
Template.referenceForm.rendered = function() {
  return toggleFieldDisplays(this);
};


var getPubMedDetails = function(pubmedID, cb) {
  var url = "http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=" + pubmedID + "&rettype=docsum&retmode=xml";

  return HTTP.get(url, function(err, result) {
    var auth, authors, first, fullCitation, isError, journal_source, pmid, pubDate, second, shortCitation, so, title, xml, xmlDoc, year;

    // assume an error occurred by default
    fullCitation = "An error occurred.";
    shortCitation = "";
    isError = true;

    if (result) {
      xmlDoc = $.parseXML(result.content);
      xml = $(xmlDoc);

      err = xml.find("ERROR");
      if (err.length >= 1) {
        fullCitation = xml.find("ERROR").text();
      } else {
        // Parse XML for text, we use the AuthorList children to
        // filter for both "Author" and "CollectiveName" fields,
        // as an example see PMID 187847.
        authors = (function() {
          var i, len, ref1, results;
          ref1 = xml.find('Item[Name=AuthorList]').children();
          results = [];
          for (i = 0, len = ref1.length; i < len; i++) {
            auth = ref1[i];
            results.push(auth.innerHTML);
          }
          return results;
        })();
        title = xml.find("Item[Name=Title]").text();
        journal_source = xml.find("Item[Name=Source]").text();
        so = xml.find("Item[Name=SO]").text();
        pmid = xml.find("Id").text();
        year = pubDate = xml.find("Item[Name=PubDate]").text().substr(0, 4);

        // build short-citation
        first = authors[0].substr(0, authors[0].search(" "));
        shortCitation = first + " (" + year + ")";
        if (authors.length > 2) {
          shortCitation = first + " et al. (" + year + ")";
        } else if (authors.length === 2) {
          second = authors[1].substr(0, authors[1].search(" "));
          shortCitation = first + " and " + second + " (" + year + ")";
        }

        // build full-citation, using the PubMed Summary format, found here:
        // http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=#{pubmedID}&rettype=docsum&retmode=text
        fullCitation = ((authors.join(', ')) + ". " +
                         title + ". " +
                         journal_source + ". " +
                         so + ". PubMed PMID: " +
                         pmid + ".");
        isError = false;
      }
    }
    return cb({
      'shortCitation': shortCitation,
      'fullCitation': fullCitation,
      'isError': isError,
      'pubmedID': pubmedID
    });
  });
},
searchRefHelper = function(qry, cb) {
  qry = {
    qry: qry,
    monographAgent: Session.get('monographAgent')
  };
  Meteor.call("searchReference", qry, function(err, res) {
    if (err) return console.log(err);
    _.each(res, function(d){d.value = d.name;});
    return cb(res);
  });
};
Template.referenceSingleSelect.searchReference = searchRefHelper;
Template.referenceSingleSelect.helpers({
  getMonographAgent: function() {
    return Session.get("monographAgent");
  }
});
Template.referenceSingleSelect.events({
  'typeahead:selected': function(evt, tmpl, v) {
    var div = $(tmpl.find('div.selectedReference')).empty();
    Blaze.renderWithData(Template.referenceSingleSelectSelected, {referenceID: v._id}, div[0]);
    $(evt.target).typeahead("val", "");
  },
  'click .selectListRemove': function(evt, tmpl) {
    $(evt.currentTarget).parent().remove();
  }
});
Template.referenceSingleSelect.rendered = function() {
  var div = $(this.find('div.selectedReference'));
  // if a new reference is created, inject it into the input scope
  Tracker.autorun(function() {
    var ref_id = Session.get("referenceNewObj");
    if (ref_id !== null) {
      div.empty();
      Blaze.renderWithData(Template.referenceSingleSelectSelected, {referenceID: ref_id}, div[0]);
      Session.set("referenceNewObj", null);
    }
  });
  Meteor.typeahead.inject();
};


var getCurrentReferenceIds = function(tmpl){
  var $ul = $(tmpl.find('ul'));
      ids = [];
  $ul.find('li').each(function(i, li){
    ids.push($(li).data('id'));
  });
  return ids;
};
Template.referenceMultiSelect.searchReference = searchRefHelper;
Template.referenceMultiSelect.events({
  'typeahead:selected': function(evt, tmpl, v) {
    var $ul = $(tmpl.find('ul'));
        ids = getCurrentReferenceIds(tmpl);

    if (ids.indexOf(v._id) < 0) {
      Blaze.renderWithData(Template.referenceMultiSelectListLI, v._id, $ul[0]);
    }
    return $(evt.target).typeahead("val", "");
  },
  'click .selectListRemove': function(evt, tmpl) {
    return $(evt.currentTarget).parent().remove();
  }
});
Template.referenceMultiSelect.rendered = function() {
  var $ul = $(this.find('ul')),
      tmpl = this, ids;

  // if a new reference is created, inject it into the input scope
  Tracker.autorun(function() {
    var ref_id = Session.get("referenceNewObj");
    if (ref_id !== null) {
      ids = getCurrentReferenceIds(tmpl);
      if (ids.indexOf(ref_id) < 0) {
        Blaze.renderWithData(Template.referenceMultiSelectListLI, ref_id, $ul[0]);
      }
      Session.set("referenceNewObj", null);
    }
  });

  return Meteor.typeahead.inject();
};


Template.printReference.helpers({
  getReference: function(id) {
    return Reference.findOne({_id: id});
  },
  showHyperlink: function() {
    return isFinite(this.pubmedID) || this.otherURL;
  },
  getHyperlink: function() {
    if (isFinite(this.pubmedID)) {
      return "http://www.ncbi.nlm.nih.gov/pubmed/" + this.pubmedID + "/";
    } else {
      return this.otherURL;
    }
  }
});
Template.printReference.rendered = function() {
  return $(this.find('*[data-toggle=popover]')).popover({
    trigger: 'hover',
    placement: 'bottom',
    delay: {show: 500, hide: 300}
  });
};


var getImportWS = function(wb, statusCB) {
  var ws;
  try {
    wb.SheetNames.forEach(function(name){
      if ((wb.Sheets[name]['A1'].v === "PubMed ID") &&
          (wb.Sheets[name]['B1'].v === "Name") &&
          (wb.Sheets[name]['C1'].v === "Full Citation") &&
          (wb.Sheets[name]['D1'].v === "Other URL") &&
          (wb.Sheets[name]['E1'].v === "PDF URL")) {
        if (statusCB){
          statusCB({
            "isError": false,
            "status": "Ready for import!"
          })
        }
        ws = wb.Sheets[name];
      }
    });
  } catch (err) {}

  if (ws === undefined){
    if (statusCB){
      statusCB({
        "isError": true,
        "status": "No worksheet matches the required format. Please use the proper spreadsheet format."
      });
    }
  }
  return ws;
};
Template.referenceBatchUpload.events({
  'change input[name=excelReferences]': function(evt, tmpl) {
    var printStatus = function(obj) {
          var div = $(tmpl.find("#uploadStatusDiv")),
              okBtn = $(tmpl.find("#uploadReferences"));

          div.hide();
          $(tmpl.find('#uploadStatus')).text(obj.status);
          if (obj.isError) {
            div.addClass('alert-warning');
            div.removeClass('alert-success');
          } else {
            div.removeClass('alert-warning');
            div.addClass('alert-success');
          }

          (!obj.isError) ? okBtn.fadeIn() : okBtn.fadeOut();

          return div.fadeIn();
        },
        loadWB = function(file, success, error) {
          var fr = new FileReader();
          fr.onload = function(e) {
            var data, err, wb;
            try {
              wb = XLSX.read(e.target.result, {type: 'binary'});
              if ((success != null)) {return success(wb, error);}
            } catch (err) {
              console.log(err);
              if ((error != null)) {
                return error({
                  isError: true,
                  status: 'Please upload an Excel file with the "xlsx" extension.'
                });
              }
            }
          };
          return fr.readAsBinaryString(file);
        },
        file = evt.target.files[0];

    return loadWB(file, getImportWS, printStatus);
  },
  'click #uploadReferences': function(evt, tmpl) {
    var div = $(tmpl.find("#uploadStatusDiv")),
        append_status = function(rowID) {
          div.append("<p>Importing row " + rowID + ": </p>");
        },
        createReferences = function(rows) {
          var pubmedCB = function(v) {
            if (v.isError) {
              append_status('failure! (PMID import error)');
            } else {
              Reference.insert({
                "name": v.shortCitation,
                "referenceType": "PubMed",
                "pubmedID": parseInt(v.pubmedID, 10),
                "otherURL": "",
                "fullCitation": v.fullCitation,
                "monographAgent": [Session.get('monographAgent')],
                "pdfURL": row['PDF URL']
              });
            }
          }
          rows.forEach(function(row){
            var rowID = row.__rowNum__ + 1,
                PMID = row['PubMed ID'],
                status = append_status(rowID);

            if (PMID != null) {
              if (isFinite(parseInt(PMID, 10))) {
                getPubMedDetails(PMID, pubmedCB);
              } else {
                append_status('failure! (PMID is not numeric)');
              }
            } else {
              Reference.insert({
                "name": row['Name'] || "INSERT NAME",
                "referenceType": "Other",
                "otherURL": row['Other URL'],
                "fullCitation": row['Full Citation'] || "ADD DESCRIPTION",
                "monographAgent": [Session.get('monographAgent')],
                "pdfURL": row['PDF URL']
              });
            }
          });

        },
        file = $('input[Name=excelReferences]')[0].files[0],
        wb = null,
        fr = new FileReader();

    fr.onload = function(e) {
      wb = XLSX.read(e.target.result, {type: 'binary'});
    };

    fr.onloadend = function(e) {
      var ws = getImportWS(wb),
          rows = XLSX.utils.sheet_to_json(ws);
      createReferences(rows);
    };

    div.empty().removeClass();
    fr.readAsBinaryString(file);
  }
});
Template.referenceBatchUpload.rendered = function() {
  return $.getScript("//cdnjs.cloudflare.com/ajax/libs/xlsx/0.7.7/xlsx.full.min.js");
};
