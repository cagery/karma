import React from "react";
import { act } from "react-dom/test-utils";

import { mount } from "enzyme";

import fetchMock from "fetch-mock";

import toDiffableHtml from "diffable-html";

import { advanceTo, advanceBy, clear } from "jest-date-mock";

import { EmptyAPIResponse } from "__mocks__/Fetch";

import { AlertStore } from "Stores/AlertStore";
import { Settings } from "Stores/Settings";

import { Fetcher, Dots } from ".";

let alertStore: AlertStore;
let settingsStore: Settings;
let fetchSpy: any;
let requestAnimationFrameSpy: any;

beforeAll(() => {
  jest.useFakeTimers();
});

beforeEach(() => {
  advanceTo(new Date(Date.UTC(2000, 1, 1, 0, 0, 0)));

  alertStore = new AlertStore(["label=value"]);
  fetchSpy = jest
    .spyOn(alertStore, "fetchWithThrottle")
    .mockImplementation(() => {
      alertStore.status.setIdle();
      return new Promise((success) => {
        success();
      });
    });

  settingsStore = new Settings(null);
  settingsStore.fetchConfig.setInterval(30);

  requestAnimationFrameSpy = jest
    .spyOn(window, "requestAnimationFrame")
    .mockImplementation((cb: any) => {
      cb();
      return 0;
    });
});

afterEach(() => {
  alertStore.status.resume();
  requestAnimationFrameSpy.mockRestore();
  jest.clearAllTimers();
  jest.clearAllMocks();
  jest.restoreAllMocks();
  clear();
  fetchMock.reset();
});

const MockEmptyAPIResponseWithoutFilters = () => {
  const response = EmptyAPIResponse();
  response.filters = [];
  fetchMock.reset();
  fetchMock.mock("*", {
    status: 200,
    body: JSON.stringify(response),
  });
};

const MountedFetcher = () => {
  return mount(
    <Fetcher alertStore={alertStore} settingsStore={settingsStore} />
  );
};

describe("<Fetcher />", () => {
  it("changing interval changes how often fetch is called", () => {
    settingsStore.fetchConfig.setInterval(1);
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    advanceBy(3 * 1000);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    settingsStore.fetchConfig.setInterval(600);

    advanceBy(3 * 1000);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    advanceBy(32 * 1000);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    advanceBy(62 * 1000);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    advanceBy(602 * 1000);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("calls alertStore.fetchWithThrottle on mount", () => {
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("calls alertStore.fetchWithThrottle again after filter change", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    const tree = MountedFetcher();
    alertStore.filters.setFilterValues([]);
    tree.setProps({});
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("keeps calling alertStore.fetchWithThrottle every minute", () => {
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    advanceBy(62 * 1000);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    advanceBy(62 * 1000);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    advanceBy(62 * 1000);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });

  it("calls alertStore.fetchWithThrottle with empty sort arguments when sortOrder=default", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.setSortOrder("default");
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledWith("", false, "", "", "");
  });

  it("calls alertStore.fetchWithThrottle with correct sort arguments when sortOrder=disabled reverseSort=false", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.setSortOrder("disabled");
    settingsStore.gridConfig.setSortReverse(false);
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledWith("", false, "disabled", "", "");
  });

  it("calls alertStore.fetchWithThrottle with correct sort arguments when sortOrder=disabled reverseSort=true", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.setSortOrder("disabled");
    settingsStore.gridConfig.setSortReverse(true);
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledWith("", false, "disabled", "", "");
  });

  it("calls alertStore.fetchWithThrottle with correct sort arguments when sortOrder=startsAt reverseSort=false", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.setSortOrder("startsAt");
    settingsStore.gridConfig.setSortReverse(false);
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledWith("", false, "startsAt", "", "0");
  });

  it("calls alertStore.fetchWithThrottle with correct sort arguments when sortOrder=startsAt reverseSort=true", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.setSortOrder("startsAt");
    settingsStore.gridConfig.setSortReverse(true);
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledWith("", false, "startsAt", "", "1");
  });

  it("calls alertStore.fetchWithThrottle with correct sort arguments when sortOrder=label sortLabel=cluster reverseSort=false", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.setSortOrder("label");
    settingsStore.gridConfig.setSortLabel("cluster");
    settingsStore.gridConfig.setSortReverse(false);
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledWith("", false, "label", "cluster", "0");
  });

  it("calls alertStore.fetchWithThrottle with correct sort arguments when sortOrder=label sortLabel=job reverseSort=true", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.setSortOrder("label");
    settingsStore.gridConfig.setSortLabel("job");
    settingsStore.gridConfig.setSortReverse(true);
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledWith("", false, "label", "job", "1");
  });

  it("calls alertStore.fetchWithThrottle with correct sort arguments when sortOrder=label sortLabel=instance reverseSort=null", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.setSortOrder("label");
    settingsStore.gridConfig.setSortLabel("instance");
    settingsStore.gridConfig.setSortReverse(null);
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledWith("", false, "label", "instance", "");
  });

  it("calls alertStore.fetchWithThrottle with gridLabel=cluster gridSortReverse=false", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.setSortOrder("default");
    settingsStore.multiGridConfig.setGridLabel("cluster");
    settingsStore.multiGridConfig.setGridSortReverse(false);
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledWith("cluster", false, "", "", "");
  });

  it("calls alertStore.fetchWithThrottle with gridLabel=cluster gridSortReverse=true", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.setSortOrder("default");
    settingsStore.multiGridConfig.setGridLabel("cluster");
    settingsStore.multiGridConfig.setGridSortReverse(true);
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledWith("cluster", true, "", "", "");
  });

  it("calls alertStore.fetchWithThrottle with gridLabel= gridSortReverse=true", () => {
    MockEmptyAPIResponseWithoutFilters();
    const fetchSpy = jest.spyOn(alertStore, "fetchWithThrottle");
    settingsStore.gridConfig.setSortOrder("default");
    settingsStore.multiGridConfig.setGridLabel("");
    settingsStore.multiGridConfig.setGridSortReverse(true);
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledWith("", true, "", "", "");
  });

  it("internal timer is null after unmount", () => {
    const tree = MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    tree.unmount();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    settingsStore.gridConfig.setSortReverse(
      !settingsStore.gridConfig.config.reverseSort
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("doesn't fetch on mount when paused", () => {
    alertStore.status.pause();
    MountedFetcher();
    expect(fetchSpy).toHaveBeenCalledTimes(0);
  });

  it("doesn't fetch on update when paused", () => {
    alertStore.status.pause();
    MountedFetcher();
    settingsStore.gridConfig.setSortReverse(
      !settingsStore.gridConfig.config.reverseSort
    );
    expect(fetchSpy).toHaveBeenCalledTimes(0);
  });

  it("fetches on update when resumed", () => {
    alertStore.status.pause();
    MountedFetcher();
    alertStore.status.resume();
    settingsStore.gridConfig.setSortReverse(
      !settingsStore.gridConfig.config.reverseSort
    );
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("fetches on resume", () => {
    alertStore.status.pause();
    MountedFetcher();
    alertStore.status.resume();
    advanceBy(2 * 1000);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("<Fetcher /> children", () => {
  it("renders Dots when countdown is in progress", () => {
    const tree = MountedFetcher();
    expect(tree.find("div.components-fetcher")).toHaveLength(1);
  });

  it("doesn't render any children when upgrade is needed", () => {
    act(() => {
      alertStore.info.upgradeNeeded = true;
    });
    const tree = MountedFetcher();
    expect(tree.find("div.navbar-brand").children()).toHaveLength(0);
  });

  it("renders PauseButton when paused", () => {
    const tree = MountedFetcher();
    act(() => {
      alertStore.status.pause();
    });
    expect(toDiffableHtml(tree.html())).toMatch(/fa-pause/);
  });

  it("renders PauseButton when paused and hovered", () => {
    const tree = MountedFetcher();
    act(() => {
      alertStore.status.pause();
    });
    tree.find(".navbar-brand").simulate("mouseenter");
    tree.update();
    expect(toDiffableHtml(tree.html())).toMatch(/fa-pause/);

    tree.find(".navbar-brand").simulate("mouseleave");
    tree.update();
    expect(toDiffableHtml(tree.html())).toMatch(/fa-pause/);
  });

  it("renders PlayButton when hovered", () => {
    const tree = MountedFetcher();
    tree.find(".navbar-brand").simulate("mouseenter");
    tree.update();
    expect(toDiffableHtml(tree.html())).toMatch(/fa-play/);

    tree.find(".navbar-brand").simulate("mouseleave");
    tree.update();
    expect(tree.find("div.components-fetcher")).toHaveLength(1);
  });
});

describe("<Dots />", () => {
  it("matches snapshot", () => {
    const tree = mount(<Dots alertStore={alertStore} dots={8} />);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });

  it("adds 'fetching' class when fetching data", () => {
    act(() => {
      alertStore.status.setFetching();
    });
    const tree = mount(<Dots alertStore={alertStore} dots={8} />);
    expect(tree.find("div.components-fetcher").hasClass("fetching")).toBe(true);
  });

  it("adds 'processing' class when processing fetched data", () => {
    act(() => {
      alertStore.status.setProcessing();
    });
    const tree = mount(<Dots alertStore={alertStore} dots={8} />);
    expect(tree.find("div.components-fetcher").hasClass("processing")).toBe(
      true
    );
  });

  it("adds 'retrying' class when fetch needs a retry", () => {
    act(() => {
      alertStore.info.setIsRetrying();
    });
    const tree = mount(<Dots alertStore={alertStore} dots={8} />);
    expect(tree.find("div.components-fetcher").hasClass("retrying")).toBe(true);
  });
});
