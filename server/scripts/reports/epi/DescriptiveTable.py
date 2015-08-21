from docxUtils.reports import DOCXReport
from docxUtils.tables import TableMaker


class EpiDescriptiveTables(DOCXReport):

    @classmethod
    def build_dual_field(cls, tbl, row, header, text="", runs=None, colspan=None):
        tbl.new_th(row, 0, header)
        if runs:
            tbl.new_td_run(row, 1, runs, colspan=colspan)
        else:
            tbl.new_td_txt(row, 1, text, colspan=colspan)

    def build_desc_tbl(self, d):

        colWidths = [1.5, 0.7, 1.4, 1.4, 4.0]
        tbl = TableMaker(colWidths, numHeaders=2, tblStyle="ntpTbl")

        # write title
        txt = u"Table X: Study description and methodologies: {}".format(d["reference"]["name"])
        tbl.new_th(0, 0, txt, colspan=5)

        # write header
        row = 1
        tbl.new_th(row, 0, "Field")
        tbl.new_th(row, 1, "Description", colspan=4)
        tbl.new_th(row, 2, "")
        tbl.new_th(row, 3, "")
        tbl.new_th(row, 4, "")
        row += 1

        # write data-rows
        runs = [
            tbl.new_run(d["reference"]["name"], i=True),
            tbl.new_run(d["reference"]["fullCitation"], newline=False)
        ]
        self.build_dual_field(tbl, row, "Reference", runs=runs, colspan=4)
        row += 1

        txt = d["studyDesign"]
        self.build_dual_field(tbl, row, "Study-design type", text=txt, colspan=4)
        row += 1

        txt = u"{}; {}".format(d["location"], d["enrollmentDates"])
        self.build_dual_field(tbl, row, "Location and enrollment dates", text=txt, colspan=4)
        row += 1

        txt = d.get("populationDescription", "")
        self.build_dual_field(tbl, row, "Population description", text=txt, colspan=4)
        row += 1

        if d["isCaseControl"]:

            # build specialized table
            txt = "Case-control description and eligibility criteria"
            tbl.new_th(row, 0, txt, rowspan=3)

            tbl.new_td_txt(row, 1, "")
            tbl.new_td_run(row, 2, [tbl.new_run("Population size", i=True, newline=False)])
            tbl.new_td_run(row, 3, [tbl.new_run("Response rates", i=True, newline=False)])
            tbl.new_td_run(row, 4, [tbl.new_run("Source", i=True, newline=False)])
            row += 1

            tbl.new_td_txt(row, 1, "Cases")
            tbl.new_td_txt(row, 2, d["populationSizeCase"])
            tbl.new_td_txt(row, 3, d.get("wrd_responseRateCase", ""))
            tbl.new_td_txt(row, 4, d["sourceCase"])
            row += 1

            tbl.new_td_txt(row, 1, "Controls")
            tbl.new_td_txt(row, 2, d["populationSizeControl"])
            tbl.new_td_txt(row, 3, d.get("wrd_responseRateControl", ""))
            tbl.new_td_txt(row, 4, d["sourceControl"])
            row += 1

        else:
            txt = d.get("eligibilityCriteria", "")
            self.build_dual_field(tbl, row, "Eligibility criteria", text=txt, colspan=4)
            row += 1

            runs = [
                tbl.new_run("Population size: ", i=True, newline=False),
                tbl.new_run(unicode(d.get("populationSize", ""))),
                tbl.new_run("Loss-to-follow-up: ", i=True, newline=False),
                tbl.new_run(unicode(d.get("lossToFollowUp", ""))),
                tbl.new_run("Referent Group: ", i=True, newline=False),
                tbl.new_run(d.get("referentGroup", ""), newline=False),
            ]
            self.build_dual_field(tbl, row, "Cohort details", runs=runs, colspan=4)
            row += 1

            txt = d.get("outcomeDataSource", "")
            self.build_dual_field(tbl, row, "Outcome data source", text=txt, colspan=4)
            row += 1

        txt = d["exposureAssessmentType"]
        self.build_dual_field(tbl, row, "Exposure assessment", text=txt, colspan=4)
        row += 1

        txt = d.get("exposureAssessmentNotes", "")
        self.build_dual_field(tbl, row, "Exposure assessment notes", text=txt, colspan=4)
        row += 1

        txt = d.get("exposureLevel", "")
        self.build_dual_field(tbl, row, "Exposure-level", text=txt, colspan=4)
        row += 1

        txt = d.get("wrd_coexposuresList", "")
        self.build_dual_field(tbl, row, "Coexposures", text=txt, colspan=4)
        row += 1

        covariates = []
        ccTxt = set()
        for res in d.get("results", []):
            covariates.extend(res["covariates"])
            txt = res.get("covariatesControlledText")
            if txt:
                ccTxt.add(txt)
        covariates = u", ".join(sorted(set(covariates)))
        ccTxt = u", ".join(sorted(ccTxt))

        runs = [
            tbl.new_run("Analytical methods: ", i=True, newline=False),
            tbl.new_run(d.get("wrd_notes", "")),
            tbl.new_run("Covariates: ", i=True, newline=False),
            tbl.new_run(covariates),
            tbl.new_run("Confounder consideration: ", i=True, newline=False),
            tbl.new_run(ccTxt, newline=False),
        ]
        self.build_dual_field(tbl, row, "Analysis methods and control for confounding", runs=runs, colspan=4)
        row += 1

        tbl.render(self.doc)

    def create_content(self):
        doc = self.doc
        d = self.context

        self.setLandscape()

        # title
        txt = u"{} {}: Study descriptions and methodologies".format(
            d["tables"][0]["volumeNumber"],
            d["tables"][0]["monographAgent"])
        p = doc.paragraphs[0]
        p.text = txt
        p.style = "Title"
        doc.add_paragraph(d["tables"][0]["name"])

        # build table for each organ-site
        for desc in sorted(
            d["descriptions"],
            key=lambda d: (d["isCaseControl"], d["reference"]["name"])
        ):
            self.build_desc_tbl(desc)
            self.doc.add_page_break()

    def get_template_fn(self):
        return "base.docx"