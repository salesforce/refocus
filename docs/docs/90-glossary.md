---
layout: docs
title: Glossary
---

# Glossary

Refocus is a powerful visualization platform to monitor the health of your services. This document outlines some of the terminology we use when working with Refocus.

# Table of Contents
   * [Subjects](#subjects)
   * [Aspects](#aspects)
   * [Samples](#samples)
   * [Lens](#lens)
   * [Perspective](#perspective)

## Subjects
A Subject is a person or thing that is being discussed, described, or dealt with. In the context of Refocus, it's the heart of the data model. Each Subject represents a system under monitoring and lives in a hierarchy.

## Aspects
An Aspect is a particular part or feature of something; a specific way in which something can be considered; a particular appearance or quality. In Refocus, Aspects represent the different characteristics that we monitor on Subjects such as average page time, login failures, average network speed, message queue backlog, and more.

## Samples 
A Sample is a specimen taken for scientific testing or analysis. In Refocus, a Sample is how you set the value for a particular Aspect on a particular Subject at a point in time. Samples can be associated with Subjects at any level of the Subject hierarchy. A Sample is expected to be updated at the frequency set in its Aspect's `timeout` field.

## Lens
A Lens is the visualization that enables you to view the underlying data within Refocus. Different lenses use different kinds of layouts to represent subjects and samples. Select a lens which provides the clearest representation of what you want to focus on.

With the Lens Developer Kit (LDK), you can create your own lens based on your specific needs. When you install your lens into Refocus, other users will be able to access it as well.

## Perspective
A Perspective displays Subject and Sample data for some set of Subjects and Aspects you care about, using the Lens you select.
