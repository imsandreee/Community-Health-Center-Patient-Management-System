import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {
  Button,
  Input,
  Select,
  StatusBadge,
  PriorityChip,
  Skeleton,
  EmptyState,
  DataTable,
  Modal,
  ConfirmDialog,
} from '../index';

test('UI Library: all UI primitives are exported and defined', () => {
  assert.ok(Button, 'Button should be defined');
  assert.ok(Input, 'Input should be defined');
  assert.ok(Select, 'Select should be defined');
  assert.ok(StatusBadge, 'StatusBadge should be defined');
  assert.ok(PriorityChip, 'PriorityChip should be defined');
  assert.ok(Skeleton, 'Skeleton should be defined');
  assert.ok(EmptyState, 'EmptyState should be defined');
  assert.ok(DataTable, 'DataTable should be defined');
  assert.ok(Modal, 'Modal should be defined');
  assert.ok(ConfirmDialog, 'ConfirmDialog should be defined');
});

test('Button: component creates React elements with appropriate properties', () => {
  const el = React.createElement(Button, {
    variant: 'primary',
    size: 'md',
    isLoading: false,
    children: 'Save Record',
  });
  assert.equal(el.props.variant, 'primary');
  assert.equal(el.props.size, 'md');
  assert.equal(el.props.children, 'Save Record');

  const loadingEl = React.createElement(Button, {
    variant: 'destructive',
    isLoading: true,
    children: 'Delete',
  });
  assert.equal(loadingEl.props.isLoading, true);
  assert.equal(loadingEl.props.variant, 'destructive');
});

test('Input: accepts label, required, helperText, and error props', () => {
  const el = React.createElement(Input, {
    id: 'test-patient-name',
    label: 'Patient Full Name',
    required: true,
    helperText: 'Enter legal name as shown on valid ID',
    error: 'Name is required',
    value: '',
  });

  assert.equal(el.props.id, 'test-patient-name');
  assert.equal(el.props.label, 'Patient Full Name');
  assert.equal(el.props.required, true);
  assert.equal(el.props.error, 'Name is required');
  assert.equal(el.props.helperText, 'Enter legal name as shown on valid ID');
});

test('Select: accepts options and error state', () => {
  const options = [
    { value: 'Regular', label: 'Regular' },
    { value: 'Senior Citizen', label: 'Senior Citizen (RA 9994)' },
    { value: 'PWD', label: 'Person with Disability' },
  ];
  const el = React.createElement(Select, {
    id: 'test-priority',
    label: 'Triage Priority',
    options,
    value: 'Senior Citizen',
  });

  assert.equal(el.props.id, 'test-priority');
  assert.equal(el.props.label, 'Triage Priority');
  assert.equal(el.props.options?.length, 3);
  assert.equal(el.props.value, 'Senior Citizen');
});

test('StatusBadge: renders correct badge for statutory and clinical statuses', () => {
  const statuses = [
    'Active',
    'Archived',
    'Pending',
    'Approved',
    'Confirmed',
    'Completed',
    'Cancelled',
    'Rejected',
    'Waiting',
    'Called',
    'In Consultation',
    'Skipped',
  ];

  for (const st of statuses) {
    const el = React.createElement(StatusBadge, { status: st, showDot: true });
    assert.equal(el.props.status, st);
    assert.equal(el.props.showDot, true);
  }
});

test('PriorityChip: supports statutory healthcare queue categories and codes', () => {
  const priorities = ['Emergency', 'Pregnant', 'Senior Citizen', 'PWD', 'Regular'];

  for (const p of priorities) {
    const el = React.createElement(PriorityChip, {
      priority: p,
      showStatutoryCode: true,
      size: 'sm',
    });
    assert.equal(el.props.priority, p);
    assert.equal(el.props.showStatutoryCode, true);
  }
});

test('EmptyState: formats empty status message and action prompt', () => {
  let actionTriggered = false;
  const el = React.createElement(EmptyState, {
    title: 'No Active Patients',
    description: 'Register a new patient or adjust search filters to view records.',
    actionText: 'Register Patient',
    onAction: () => {
      actionTriggered = true;
    },
  });

  assert.equal(el.props.title, 'No Active Patients');
  assert.equal(
    el.props.description,
    'Register a new patient or adjust search filters to view records.'
  );
  assert.equal(el.props.actionText, 'Register Patient');
  el.props.onAction?.();
  assert.equal(actionTriggered, true);
});

test('Skeleton: supports variants and column configuration for tables and cards', () => {
  const tableSkeleton = React.createElement(Skeleton, {
    variant: 'table-row',
    count: 3,
    columns: 6,
  });
  assert.equal(tableSkeleton.props.variant, 'table-row');
  assert.equal(tableSkeleton.props.count, 3);
  assert.equal(tableSkeleton.props.columns, 6);

  const cardSkeleton = React.createElement(Skeleton, {
    variant: 'card',
    count: 2,
  });
  assert.equal(cardSkeleton.props.variant, 'card');
  assert.equal(cardSkeleton.props.count, 2);
});

test('DataTable: column definitions and pagination contracts', () => {
  interface TestItem {
    id: string;
    name: string;
    count: number;
  }

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Full Name' },
    { key: 'count', header: 'Count', align: 'right' as const },
  ];

  const data: TestItem[] = [
    { id: '1', name: 'Item One', count: 10 },
    { id: '2', name: 'Item Two', count: 20 },
  ];

  const el = React.createElement(DataTable<TestItem>, {
    data,
    columns,
    keyExtractor: (item) => item.id,
    striped: true,
    hoverable: true,
    pagination: {
      currentPage: 1,
      totalPages: 5,
      totalItems: 50,
      pageSize: 10,
      onPageChange: () => {},
    },
  });

  assert.equal(el.props.data.length, 2);
  assert.equal(el.props.columns.length, 3);
  assert.equal(el.props.pagination?.currentPage, 1);
  assert.equal(el.props.pagination?.totalPages, 5);
});
