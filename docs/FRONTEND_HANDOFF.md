# ClaimLens AI — Frontend Handoff Reference

## Overview
This document captures key frontend contracts, conventions, schemas, and endpoint specifications provided for the ClaimLens AI platform.

## Key Actors
- **Claimant**: Aarav Kumar (`usr_aarav`), Rohan Das (`usr_rohan`), Priya Raman (`usr_priya`), Karthik S (`usr_karthik`)
- **Verifier**: Meera Iyer (`usr_meera`), Vikram Shah (`usr_vikram`)

## Enums and Types
- **Claim Status**: `draft`, `new`, `in_review`, `awaiting_claimant`, `decision_pending`, `completed`
- **Checklist Requirement**: `required`, `conditionally_required`, `optional`, `not_applicable`
- **Checklist Status**: `not_started`, `uploaded`, `processing`, `received`, `reviewed`, `needs_replacement`, `requested`, `unavailable`, `not_applicable`
- **Evidence Review Status**: `pending`, `reviewed`, `needs_replacement`
- **Request Status**: `draft`, `sent`, `response_submitted`, `resolved`, `not_applicable`
- **Finding Type**: `inconsistency`, `missing_information`, `calculation_check`, `low_evidence_hypothesis`, `policy_exclusion`, `coverage_observation`
- **Finding Priority**: `high`, `medium`, `low`, `informational`
- **Finding Status / Review**: `open`, `useful`, `dismissed`, `clarification_requested`
- **Decision**: `pending`, `recommend_approve`, `recommend_partial`, `recommend_reject`, `more_information_required`, `closed`
- **Settlement Status**: `calculated`, `withheld`
- **Settlement Line Kind**: `estimate_total`, `deductible`, `sublimit`, `depreciation`, `eligible_amount`, `final_calculated`

## Role-based Projections
- Claimants can only access their own claims (`claimantId === actor.id`).
- Verifiers can access non-draft claims that are unassigned or assigned to them (`assigneeId === actor.id || !assigneeId`).
- Private notes are verifier-only; claimants get 403 on `/private-notes`.
- Findings, matrix, settlement calculations, policy interpretations, internal decisions, and verifier assumptions are strictly stripped from claimant responses.

