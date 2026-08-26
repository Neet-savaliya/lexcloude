/**
 * Evaluation test set for LexCloud's RAG pipeline.
 *
 * 5 distinct synthetic-but-realistic bail case documents (different accused,
 * charges, outcomes, and bail types — not just variations on one document),
 * each with ground-truth questions. Every question's `mustContain` array
 * lists the exact facts a CORRECT answer must include — this is what makes
 * scoring automatable instead of a human reading transcripts by eye.
 *
 * Case 1 (Vikram Haresh Desai) is the same document used in manual testing
 * throughout development, kept here as a real regression case.
 */

const cases = [
  {
    caseName: "State vs Vikram Haresh Desai",
    clientName: "Vikram Haresh Desai",
    docName: "vikram_desai_bail_order.txt",
    text: `IN THE COURT OF THE ADDITIONAL SESSIONS JUDGE
COURT NO. 3, AHMEDABAD CITY SESSIONS DIVISION, AHMEDABAD, GUJARAT
Sessions Case No. 447 of 2024 — FIR No. 312/2024, PS Naranpura, Ahmedabad
APPLICATION FOR BAIL UNDER SECTION 439 OF THE CODE OF CRIMINAL PROCEDURE, 1973

APPLICANT/ACCUSED: Vikram Haresh Desai, age 41, textile trader, Navrangpura, Ahmedabad.

CHARGE AND OFFENCES ALLEGED
The applicant was arrested on 22 February 2024 for offences under Section 420 IPC (Cheating, max 7 years),
Section 406 IPC (Criminal Breach of Trust, max 3 years), and Section 120B IPC (Criminal Conspiracy).
As on the date of this application (10 May 2024), the applicant has been in custody for 78 days.

FACTS OF THE CASE
The complainant Mr. Rajeshbhai Manilal Solanki alleges the accused, representing himself as a textile
exporter, induced him to transfer Rs. 8,40,000 between March 2023 and June 2023 promising 24% returns,
and supplied goods worth only Rs. 2,10,000. No chargesheet has been filed as of this application.

PERSONAL BACKGROUND
41 years old, Type 2 Diabetic and hypertensive. Married, two children aged 12 and 8. Resident of
Ahmedabad for 19 years, owns his home, runs a business established in 2008 (16 years). No prior
criminal record. Holds passport No. Z4521837, willing to surrender it.

GROUNDS FOR BAIL
Ground 1: Statutory right to default bail under Section 437(6) CrPC — 78 days elapsed, no chargesheet
filed, offence carries max 7 years, falls under the 60-day default bail category.
Ground 2: Bail is the rule, jail is the exception (Siddharth vs State of UP, 2021) — Article 21 violation
from prolonged detention in a commercial dispute.
Ground 3: Triple test satisfied — not a flight risk (19-year resident, family, business ties), no risk of
evidence tampering (all evidence already collected), no risk of repeat offence (clean record).
Ground 4: Category A offence under Satender Kumar Antil vs CBI (2021) guidelines.
Ground 5: Article 21 violation from continued detention with investigation substantially complete.
Ground 6: Accused is diabetic and hypertensive; jail medical facilities inadequate.

PROSECUTION'S OPPOSITION
The Public Prosecutor opposed bail citing: the substantial amount (Rs. 8,40,000) suggesting premeditation;
risk of the accused pressuring the complainant and witnesses; pending forensic examination of seized
mobile phone and laptop; and the accused being the family's sole earner with means to abscond.

COURT'S ORDER
The accused was arrested on 22 February 2024; 78 days have elapsed with no chargesheet filed, granting
an indefeasible right to default bail under Section 437(6) CrPC. On merits, the accused is not a flight
risk and investigation is substantially complete.

THE APPLICATION FOR BAIL IS ALLOWED.

The applicant is ordered released on a personal bond of Rs. 50,000/- and one surety of equivalent amount,
subject to conditions: (i) surrender passport No. Z4521837 to Naranpura Police Station within 24 hours;
(ii) report to Naranpura Police Station every Monday 10 AM-12 PM; (iii) not leave Gujarat without
permission; (iv) no contact with complainant or witnesses; (v) cooperate with investigation.

Pronounced on 10 May 2024. Sd/- (R.M. Trivedi), Additional Sessions Judge, Court No. 3, Ahmedabad.`,
    questions: [
      {
        question: "How many days has the accused been in custody?",
        mustContain: ["78 days"],
      },
      {
        question: "What is the total amount the complainant alleges he lost?",
        mustContain: ["8,40,000"],
      },
      {
        question: "Was bail granted or rejected, and what was the bond amount?",
        mustContain: ["allowed", "50,000"],
      },
      {
        question: "What health condition does the accused suffer from?",
        mustContain: ["diabet"],
      },
      {
        question: "On what statutory ground was default bail argued?",
        mustContain: ["437(6)"],
      },
    ],
  },

  {
    caseName: "State vs Priya Nair",
    clientName: "Priya Nair",
    docName: "priya_nair_bail_order.txt",
    text: `IN THE COURT OF THE JUDICIAL MAGISTRATE FIRST CLASS, ERNAKULAM, KERALA
Crl. M.C. No. 118 of 2024 — FIR No. 87/2024, PS Kadavanthra, Ernakulam
APPLICATION FOR BAIL UNDER SECTION 437 OF THE CODE OF CRIMINAL PROCEDURE, 1973

APPLICANT/ACCUSED: Priya Nair, age 29, domestic worker, Kadavanthra, Ernakulam.

CHARGE: The applicant was arrested on 3 June 2024 for offences under Section 380 IPC (Theft in a
dwelling house, max 7 years) and Section 34 IPC (Common intention). As on the date of this application
(18 June 2024), the applicant has been in custody for 15 days.

FACTS OF THE CASE: The complainant, Mrs. Lakshmi Menon, alleges that gold jewellery valued at
Rs. 3,20,000 went missing from her residence where the applicant was employed as domestic help for
the past 2 years. CCTV footage from a neighbouring property allegedly shows the applicant leaving the
premises carrying a bag on the date of the incident.

PERSONAL BACKGROUND: 29 years old, unmarried, sole earner supporting her elderly parents in
Thrissur district. No prior criminal record. This is her first arrest of any kind. She has no passport
and has lived at her current rented address in Ernakulam for 4 years.

GROUNDS FOR BAIL: First-time offender with no prior criminal antecedents. The alleged offence, while
serious, does not fall in the category of heinous crimes. The investigation is complete and the recovered
jewellery, if any, is already with the police. She is willing to cooperate with further proceedings and
has strong roots in the district through her family.

PROSECUTION'S OPPOSITION: The prosecution opposed bail citing breach of trust by a domestic employee
and the value of goods involved, and expressed concern she may pressure other domestic staff who
witnessed her leaving the premises.

COURT'S ORDER: Considering the applicant is a first-time offender, the investigation is complete, and
the maximum sentence does not warrant continued incarceration pending trial, THE APPLICATION FOR
BAIL IS ALLOWED. The applicant is ordered released on a personal bond of Rs. 25,000/- with one local
surety, subject to conditions: (i) report to Kadavanthra Police Station every Friday; (ii) not leave
Ernakulam district without permission; (iii) not contact the complainant or witnesses; (iv) surrender
her Aadhaar card copy to the court as identity verification.

Pronounced on 18 June 2024. Sd/- (K. Sudhakaran), Judicial Magistrate First Class, Ernakulam.`,
    questions: [
      {
        question: "How many days has Priya Nair been in custody?",
        mustContain: ["15 days"],
      },
      {
        question: "What is the value of the jewellery alleged to be stolen?",
        mustContain: ["3,20,000"],
      },
      {
        question: "What sections is the accused charged under?",
        mustContain: ["380"],
      },
      {
        question: "What was the bond amount ordered by the court?",
        mustContain: ["25,000"],
      },
    ],
  },

  {
    caseName: "State vs Sanjay Kumar",
    clientName: "Sanjay Kumar",
    docName: "sanjay_kumar_bail_order.txt",
    text: `IN THE COURT OF THE SPECIAL JUDGE (NDPS ACT), AMRITSAR, PUNJAB
Sessions Case No. 61 of 2024 — FIR No. 205/2024, PS Sadar, Amritsar
APPLICATION FOR BAIL UNDER SECTION 439 CrPC READ WITH SECTION 37 OF THE NDPS ACT, 1985

APPLICANT/ACCUSED: Sanjay Kumar, age 34, truck driver, Batala Road, Amritsar.

CHARGE: The applicant was arrested on 14 January 2024 after a police checkpoint recovered 2 kilograms
of heroin concealed in the fuel tank of the truck he was driving, an offence under Section 21(c) of the
Narcotic Drugs and Psychotropic Substances Act, 1985 (commercial quantity, minimum sentence 10 years,
maximum 20 years). As on the date of this application (14 May 2024), the applicant has been in custody
for 120 days.

FACTS OF THE CASE: The recovery was made pursuant to a specific tip-off. The heroin was seized in the
presence of independent witnesses and sent for forensic analysis, which confirmed the substance as
heroin of high purity. The applicant claims he was unaware of the concealed contraband and was merely
transporting goods for a transport company.

PERSONAL BACKGROUND: 34 years old, married with one child. The applicant has a prior conviction from
2019 under the Punjab Excise Act for illegal liquor transport, for which he served a 6-month sentence.

GROUNDS FOR BAIL: Defence counsel argued the applicant had no direct knowledge of the concealed
contraband and that recovery from a vehicle does not by itself establish conscious possession. It was
further argued that 120 days in custody without trial completion is excessive.

PROSECUTION'S OPPOSITION: The Special Public Prosecutor opposed bail strongly, submitting that under
Section 37 of the NDPS Act, bail for commercial quantity offences cannot be granted unless the court is
satisfied there are reasonable grounds to believe the accused is not guilty and is unlikely to commit any
offence while on bail — a significantly higher threshold than ordinary bail under the CrPC. The
prosecution highlighted the applicant's prior conviction under the Excise Act as evidence of a pattern of
involvement in contraband transport, and argued the purity and quantity recovered strongly indicate
commercial trafficking rather than incidental possession.

COURT'S ORDER: Having regard to the commercial quantity involved, the twin conditions under Section 37
of the NDPS Act, and the applicant's prior conviction under the Punjab Excise Act, this Court is not
satisfied that reasonable grounds exist to believe the applicant is not guilty of the offence alleged.

THE APPLICATION FOR BAIL IS REJECTED.

The applicant shall continue in judicial custody. Liberty is granted to renew the application after the
forensic report on the vehicle's ownership and the applicant's phone records is placed on record.

Pronounced on 14 May 2024. Sd/- (H.S. Grewal), Special Judge (NDPS Act), Amritsar.`,
    questions: [
      {
        question: "How many days has Sanjay Kumar been in custody?",
        mustContain: ["120 days"],
      },
      {
        question: "How much heroin was recovered and what section was he charged under?",
        mustContain: ["2 kilograms", "21"],
      },
      {
        question: "Was bail granted or rejected in this case?",
        mustContain: ["rejected"],
      },
      {
        question: "Does the accused have any prior criminal conviction?",
        mustContain: ["excise act"],
      },
    ],
  },

  {
    caseName: "State vs Farhan Ali Sheikh",
    clientName: "Farhan Ali Sheikh",
    docName: "farhan_sheikh_bail_order.txt",
    text: `IN THE COURT OF THE SESSIONS JUDGE, ESPLANADE, MUMBAI, MAHARASHTRA
Sessions Case No. 302 of 2024 — FIR No. 511/2024, Cyber Crime Cell, Mumbai
APPLICATION FOR BAIL UNDER SECTION 439 OF THE CODE OF CRIMINAL PROCEDURE, 1973

APPLICANT/ACCUSED: Farhan Ali Sheikh, age 27, software developer, Andheri East, Mumbai.

CHARGE: The applicant was arrested on 2 April 2024 for offences under Section 420 IPC (Cheating,
max 7 years) and Section 66D of the Information Technology Act, 2000 (cheating by personation using
computer resource, max 3 years). As on the date of this application (17 May 2024), the applicant has
been in custody for 45 days.

FACTS OF THE CASE: The applicant is alleged to have developed and operated a fraudulent mobile
investment application named "QuickGain Pro" that promised guaranteed 15% monthly returns. Between
October 2023 and March 2024, a total of 63 victims across Mumbai, Pune, and Nashik allegedly deposited
a cumulative amount of Rs. 45,00,000 into accounts linked to the applicant, after which the application
stopped processing withdrawals and the applicant became unreachable.

PERSONAL BACKGROUND: 27 years old, unmarried, lives with his parents in Andheri East. No prior
criminal record. Holds a valid passport, willing to surrender it. His laptop and two mobile phones were
seized at the time of arrest and sent for forensic examination.

GROUNDS FOR BAIL: Defence counsel submitted that the applicant has cooperated with the investigation,
that the forensic examination of seized devices is nearly complete, and that continued detention serves
no further investigative purpose. It was also submitted that the applicant's family has offered to deposit
Rs. 5,00,000 towards partial restitution to the victims as a gesture of good faith.

PROSECUTION'S OPPOSITION: The prosecution opposed bail citing the large number of victims (63), the
substantial cumulative amount involved (Rs. 45,00,000), and the risk that the applicant, being technically
skilled, could destroy digital evidence or flee using undisclosed cryptocurrency assets if released.

COURT'S ORDER: Having considered the cooperation extended by the applicant, the near-completion of
forensic examination, the absence of any prior criminal record, and the offer of partial restitution, this
Court finds continued incarceration is not warranted.

THE APPLICATION FOR BAIL IS ALLOWED.

The applicant is ordered released on a personal bond of Rs. 1,00,000/- with two sureties of equivalent
amount, subject to conditions: (i) surrender his passport to the Cyber Crime Cell within 48 hours;
(ii) deposit Rs. 5,00,000 towards restitution within 30 days; (iii) fully cooperate with the forensic
examination of seized devices; (iv) report to the Cyber Crime Cell every Monday and Thursday;
(v) not access any online payment or investment platform pending trial; (vi) not leave Mumbai without
the court's prior permission.

Pronounced on 17 May 2024. Sd/- (Anjali Deshpande), Sessions Judge, Esplanade, Mumbai.`,
    questions: [
      {
        question: "How many days has Farhan Ali Sheikh been in custody?",
        mustContain: ["45 days"],
      },
      {
        question: "How many victims were affected and what was the total amount involved?",
        mustContain: ["63", "45,00,000"],
      },
      {
        question: "What restitution amount did the accused's family offer?",
        mustContain: ["5,00,000"],
      },
      {
        question: "What was the name of the fraudulent app involved?",
        mustContain: ["quickgain"],
      },
    ],
  },

  {
    caseName: "State vs Meena Devi",
    clientName: "Meena Devi",
    docName: "meena_devi_bail_order.txt",
    text: `IN THE COURT OF THE SESSIONS JUDGE, LUCKNOW, UTTAR PRADESH
Crl. Misc. Anticipatory Bail Application No. 940 of 2024 — FIR No. 198/2024, PS Hazratganj, Lucknow
APPLICATION FOR ANTICIPATORY BAIL UNDER SECTION 438 OF THE CODE OF CRIMINAL PROCEDURE, 1973

APPLICANT: Meena Devi, age 63, homemaker, Hazratganj, Lucknow (mother-in-law of the complainant).

CHARGE: An FIR was registered on 20 May 2024 against the applicant and her son under Section 498A IPC
(Cruelty by husband or relatives, max 3 years), Section 34 IPC (Common intention), and Section 406 IPC
(Criminal breach of trust regarding dowry articles). The applicant has not yet been arrested and seeks
anticipatory bail in apprehension of arrest.

FACTS OF THE CASE: The complainant, Mrs. Sunita Verma (daughter-in-law of the applicant), alleges
persistent harassment for additional dowry over an 18-month period of marriage and alleges the applicant
retained jewellery and household items given at the time of marriage. The complainant left the matrimonial
home in April 2024 and filed the FIR a month later.

PERSONAL BACKGROUND: The applicant is 63 years old with hypertension and arthritis. No specific overt
act of violence is attributed to her personally in the FIR; the allegations against her are of a general
nature common to matrimonial disputes. No prior criminal record.

GROUNDS FOR ANTICIPATORY BAIL: Defence counsel submitted that no specific instance of cruelty or
overt act is attributed to the applicant individually, that FIRs under Section 498A are frequently used to
rope in all family members of the husband, and that the applicant's advanced age and health conditions
make custodial interrogation unnecessary. Counsel cited the Supreme Court's guidelines in Arnesh Kumar
vs State of Bihar (2014) cautioning against automatic arrest in Section 498A cases.

PROSECUTION'S OPPOSITION: The Additional Public Prosecutor opposed the application on the ground
that custodial interrogation may be necessary to recover the allegedly retained jewellery and that the
applicant, being a co-resident of the matrimonial home, had direct knowledge of the alleged harassment.

COURT'S ORDER: Applying the principles laid down in Arnesh Kumar vs State of Bihar (2014), and noting
the absence of any specific overt act attributed to the applicant individually, her advanced age of 63
years, and her health conditions, this Court finds a case for anticipatory bail is made out.

THE APPLICATION FOR ANTICIPATORY BAIL IS ALLOWED.

In the event of arrest, the applicant shall be released on a personal bond of Rs. 30,000/- with one surety,
subject to conditions: (i) the applicant shall make herself available for interrogation by the Investigating
Officer as and when required; (ii) she shall not tamper with evidence or influence witnesses; (iii) she
shall not leave Lucknow without prior permission of the court; (iv) she shall cooperate in the recovery
of the jewellery articles alleged in the FIR.

Pronounced on 3 June 2024. Sd/- (Vinay Kumar Srivastava), Sessions Judge, Lucknow.`,
    questions: [
      {
        question: "What type of bail application is this and under which section?",
        mustContain: ["anticipatory", "438"],
      },
      {
        question: "What is the relationship between the applicant and the complainant?",
        mustContain: ["mother-in-law"],
      },
      {
        question: "Was anticipatory bail granted or rejected?",
        mustContain: ["allowed"],
      },
      {
        question: "What Supreme Court case did the defence rely on?",
        mustContain: ["arnesh kumar"],
      },
    ],
  },
];

module.exports = { cases };
