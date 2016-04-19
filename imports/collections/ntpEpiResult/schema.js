import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import _ from 'underscore';

import organSiteCategories from '/imports/collections/epiResult/organSiteCategories';
import {
    variableOfConcernSchema,
} from './vocSchema';


let isNumberOrNR = function() {
    if (this.isSet && (this.value === 'NR' || _.isFinite(this.value))) {
        return undefined;
    } else {
        return 'numOrNR';
    }
};

export default {
    organSiteCategory: {
        label: 'Organ site',
        type: String,
        popoverText: 'Organ site (controlled vocabulary - select one from list)',
        allowedValues: organSiteCategories.options,
        typeaheadMethod: 'searchOrganSiteCategories',
    },
    organSite: {
        label: 'Organ site details',
        type: String,
        optional: true,
        popoverText: 'Optional to further specify details, e.g ICD code, subtype',
        typeaheadMethod: 'searchNtpOrganSite',
    },
    effectMeasure: {
        label: 'Measure of effect',
        type: String,
        min: 1,
        popoverText: 'Risk metric used to display results (SMR, RR, etc.)',
        typeaheadMethod: 'searchNtpEffectMeasure',
    },
    effectUnits: {
        label: 'Units of effect measurement',
        type: String,
        optional: true,
        popoverText: 'Units, if relevant (e.g., risk per 10 μg/m3)',
        typeaheadMethod: 'searchNtpEffectUnits',
    },
    trendTest: {
        label: 'p-value for trend',
        type: Number,
        decimal: true,
        optional: true,
        popoverText: 'Provide p-value for trend-test when reported',
    },
    'riskEstimates.$.exposureCategory': {
        label: 'Exposure category or level',
        type: String,
        min: 1,
        popoverText: 'E.g., all exposed workers, second quartile of exposure, quantitative exposure level (always provide quantitative information when available)',
    },
    'riskEstimates.$.numberExposed': {
        label: 'Exposed cases/deaths',
        type: String,
        custom: isNumberOrNR,
        popoverText: 'Deaths/cases for cohort studies; Cases for case-control studies. If unknown, enter \'NR\'',
    },
    'riskEstimates.$.riskMid': {
        label: 'Risk estimate',
        type: Number,
        decimal: true,
        optional: true,
        popoverText: 'Central risk reported for risk estimate',
    },
    'riskEstimates.$.riskLow': {
        label: '95% lower CI',
        type: Number,
        decimal: true,
        optional: true,
        popoverText: '95% lower confidence interval risk estimate',
    },
    'riskEstimates.$.riskHigh': {
        label: '95% upper CI',
        type: Number,
        decimal: true,
        optional: true,
        popoverText: '95% upper confidence interval risk estimate',
    },
    'riskEstimates.$.riskEstimated': {
        label: 'WG calculation?',
        type: Boolean,
        popoverText: 'Calculations by the working-group (WG), not study-authors',
    },
    'riskEstimates.$.inTrendTest': {
        label: 'Estimate in trend-test',
        type: Boolean,
        popoverText: 'Risk estimate included in trend-test',
    },
    covariates: {
        label: 'Covariates controlled',
        type: [String],
        minCount: 1,
        popoverText: 'List all covariates which were controlled by matching or adjustment in the analysis reported. Enter each covariate individually, and then press <enter> to add it to the list. If no covariates were specified, add \'not-specified\'',
        typeaheadMethod: 'searchNtpCovariates',
    },
    covariatesControlledText: {
        label: 'Covariates controlled notes',
        type: String,
        optional: true,
        popoverText: 'Further describe how covariates were controlled, if needed, such as details on matching methodology or adjustments made',
        textAreaRows: 4,
    },
    notes: {
        label: 'Confidence of evidence',
        type: String,
        optional: true,
        popoverText: 'See the RoC handbook for guidance',
        textAreaRows: 4,
    },
    parent_id: {
        type: SimpleSchema.RegEx.Id,
        denyUpdate: true,
    },
    'variablesOfConcern': {
        type: [variableOfConcernSchema],
        minCount: 0,
    },
};
