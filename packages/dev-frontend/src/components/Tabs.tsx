import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import styles from "./Tabs.module.css";

export interface Tab {
  title: string;
  content: React.ReactChild;
  disabled?: boolean;
}

export const Tabs: React.FC<{
  label: string;
  tabs: Tab[];
}> = props => {
  return (
    <TabGroup>
      <TabList className={styles.tabList}>
        {props.tabs.map(tab => {
          return (
            <Tab disabled={tab.disabled} className={styles.tab}>
              {tab.title}
            </Tab>
          );
        })}
      </TabList>
      <TabPanels className={styles.tabPanels}>
        {props.tabs.map(tab => {
          return <TabPanel>{tab.content}</TabPanel>;
        })}
      </TabPanels>
    </TabGroup>
  );
};
