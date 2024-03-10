"use client";

import { Button, Card, MultiSelect, SearchSelect, MultiSelectItem, Badge, SearchSelectItem } from "@tremor/react";

import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from '@tremor/react';
import { IronmanData } from "./types";
import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, DownloadIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import AgeGroupMultiSelect from "./AgeGroupMultiSelect";


export default function ResultsTable({ data }: { data: IronmanData[] }) {
  const page = 10;
  const perPage = 10;

  const rows = data.slice(page*perPage, page*perPage + perPage).map((row) => {
    const status = <Badge size="xs">{row.EventStatus}</Badge>;
    const finishBadge = <Badge size="xs">{row.FinishRankGender}</Badge>
    const swimBadge = <Badge size="xs">{row.SwimRankGender}</Badge>;
    const bikeBadge = <Badge size="xs">{row.BikeRankGender}</Badge>
    const runBadge = <Badge size="xs">{row.RunRankGender}</Badge>;
    return (
      <TableRow key={row.Contact.FullName + row.AgeGroup}>
        <TableCell>{row.Contact.FullName || "?"} ({row.CountryISO2})</TableCell>
        <TableCell>{row.AgeGroup}</TableCell>
        <TableCell>{row.EventStatus === "Finish" ? <>{row.FinishTimeConverted} {finishBadge}</> : status}</TableCell>
        <TableCell>{row.SwimTimeConverted} {swimBadge}</TableCell>
        <TableCell>{row.BikeTimeConverted} {bikeBadge}</TableCell>
        <TableCell>{row.RunTimeConverted} {runBadge}</TableCell>
        <TableCell>{row.Transition1TimeConverted}</TableCell>
        <TableCell>{row.Transition2TimeConverted}</TableCell>
      </TableRow>
    );
  });

  const names = data.filter((row) => row.Contact?.FullName).map((row) => {
    return (
      <MultiSelectItem key={row.Contact.FullName} value={row.Contact.FullName}>
        {row.Contact.FullName}
      </MultiSelectItem>
    );
  }).slice(0, 100);

  return (
    <Card className="mt-6">
      <div className="flex gap-3 flex-row">
        <MultiSelect className="" placeholder="Search Athlete(s)" icon={MagnifyingGlassIcon}>
          {names}
        </MultiSelect>
        <AgeGroupMultiSelect className="max-w-[240px]"/>
        <SearchSelect className="max-w-[240px]" placeholder="Rank By" defaultValue="gender" icon={ArrowDownIcon}>
          <SearchSelectItem value="gender">Gender</SearchSelectItem>
          <SearchSelectItem value="overall">Overall</SearchSelectItem>
          <SearchSelectItem value="agegroup">Age Group</SearchSelectItem>
        </SearchSelect>
        <Button icon={DownloadIcon}>Download</Button>
      </div>
      <Table className="mt-3">
        <TableHead>
          <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Age Group</TableHeaderCell>
          <TableHeaderCell>Finish</TableHeaderCell>
          <TableHeaderCell>Swim</TableHeaderCell>
          <TableHeaderCell>Bike</TableHeaderCell>
          <TableHeaderCell>Run</TableHeaderCell>
          <TableHeaderCell>T1</TableHeaderCell>
          <TableHeaderCell>T2</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows}
        </TableBody>
      </Table>
      <div className="flex justify-end mt-3 gap-3">
        <Button variant="secondary" icon={ArrowLeftIcon}>Previous</Button>
        <Button icon={ArrowRightIcon} iconPosition="right">Next</Button>
      </div>
    </Card>
  );
}
